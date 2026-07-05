// Captures a net-worth snapshot for every household. Invoked monthly by
// pg_cron. Snapshots are immutable points (values stored as computed here),
// upserted per household+date so a re-run in the same day is idempotent.
// Protected by a shared secret because cron calls it without a user JWT.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''

Deno.serve(async (req) => {
  if (CRON_SECRET && req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const today = new Date().toISOString().slice(0, 10)

  const [nwRes, balRes] = await Promise.all([
    admin.from('net_worth_current').select('household_id, total_assets, total_liabilities, net_worth'),
    admin.from('account_balances').select('account_id, household_id, class, balance'),
  ])
  if (nwRes.error) return new Response(JSON.stringify({ error: nwRes.error.message }), { status: 500 })
  if (balRes.error) return new Response(JSON.stringify({ error: balRes.error.message }), { status: 500 })

  // Group per-account balances by household for the breakdown JSON.
  const breakdownByHousehold = new Map<string, unknown[]>()
  for (const b of balRes.data ?? []) {
    const list = breakdownByHousehold.get(b.household_id as string) ?? []
    list.push({ account_id: b.account_id, class: b.class, balance: b.balance })
    breakdownByHousehold.set(b.household_id as string, list)
  }

  const rows = (nwRes.data ?? []).map((nw) => ({
    household_id: nw.household_id,
    snapshot_date: today,
    total_assets: nw.total_assets ?? 0,
    total_liabilities: nw.total_liabilities ?? 0,
    net_worth: nw.net_worth ?? 0,
    breakdown: breakdownByHousehold.get(nw.household_id as string) ?? [],
  }))

  if (rows.length > 0) {
    const { error } = await admin
      .from('balance_snapshots')
      .upsert(rows, { onConflict: 'household_id,snapshot_date' })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ snapshots: rows.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
