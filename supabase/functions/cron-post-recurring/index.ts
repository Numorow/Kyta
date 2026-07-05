// Posts transactions for recurring rules with auto_post = true whose
// next_due_date has arrived. Invoked on a daily schedule (pg_cron → pg_net).
// auto_post defaults OFF, so this only ever touches rules the household opted
// in. Protected by a shared secret because cron calls it without a user JWT.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''

// ── date-only helpers (UTC-based so there's no timezone drift) ──────────────
function parse(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number)
  return [y, m, d]
}
function fmt(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate() // day 0 of next month
}
function addDays(iso: string, days: number): string {
  const [y, m, d] = parse(iso)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return fmt(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

type Rule = {
  id: string
  household_id: string
  account_id: string | null
  category_id: string | null
  type: 'income' | 'expense'
  amount: number
  name: string
  frequency: string
  interval_count: number
  anchor_date: string
  day_of_month: number | null
  end_date: string | null
  next_due_date: string | null
}

// The occurrence strictly after `currentIso` for this rule.
function advance(rule: Rule, currentIso: string): string {
  const interval = Math.max(1, rule.interval_count || 1)
  const [ay, , ad] = parse(rule.anchor_date)
  const advanceMonths = (n: number): string => {
    const [y, m] = parse(currentIso)
    const targetDay = rule.day_of_month ?? ad
    const total = m - 1 + n
    const y2 = y + Math.floor(total / 12)
    const m2 = (((total % 12) + 12) % 12) + 1
    void ay
    return fmt(y2, m2, Math.min(targetDay, daysInMonth(y2, m2)))
  }
  switch (rule.frequency) {
    case 'weekly':
      return addDays(currentIso, 7 * interval)
    case 'fortnightly':
      return addDays(currentIso, 14 * interval)
    case 'custom':
      return addDays(currentIso, interval)
    case 'monthly':
      return advanceMonths(interval)
    case 'quarterly':
      return advanceMonths(3 * interval)
    case 'annually':
      return advanceMonths(12 * interval)
    default:
      return addDays(currentIso, 30 * interval)
  }
}

Deno.serve(async (req) => {
  if (CRON_SECRET && req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const today = new Date().toISOString().slice(0, 10)

  const { data: rules, error } = await admin
    .from('recurring_rules')
    .select('*')
    .eq('is_active', true)
    .eq('auto_post', true)
    .not('account_id', 'is', null)
    .lte('next_due_date', today)
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  let posted = 0
  for (const rule of (rules ?? []) as Rule[]) {
    let due = rule.next_due_date
    // Catch up every occurrence from next_due_date through today (a rule left
    // unposted for weeks fills in each period), capped for safety.
    for (let i = 0; i < 400 && due && due <= today; i++) {
      if (rule.end_date && due > rule.end_date) break

      // Skip if this occurrence was already posted (idempotent re-runs).
      const { data: existing } = await admin
        .from('transactions')
        .select('id')
        .eq('recurring_rule_id', rule.id)
        .eq('txn_date', due)
        .maybeSingle()

      if (!existing) {
        const signed = rule.type === 'expense' ? -rule.amount : rule.amount
        await admin.from('transactions').insert({
          household_id: rule.household_id,
          account_id: rule.account_id,
          txn_date: due,
          amount: signed,
          type: rule.type,
          category_id: rule.category_id,
          description: rule.name,
          recurring_rule_id: rule.id,
        })
        posted++
      }
      due = advance(rule, due)
    }
    await admin.from('recurring_rules').update({ next_due_date: due }).eq('id', rule.id)
  }

  return new Response(JSON.stringify({ posted }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
