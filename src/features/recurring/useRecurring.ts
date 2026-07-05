import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import { useAuth } from '@/features/auth/AuthProvider'
import { useHouseholdId } from '@/features/household/HouseholdContext'
import { accountsKey } from '@/features/accounts/useAccounts'
import { supabase } from '@/lib/supabase'
import { todayIso } from '@/lib/money'
import {
  expandOccurrences,
  nextOccurrenceAfter,
  type RecurrenceRule,
} from '@/lib/recurrence'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type RecurringRule = Tables<'recurring_rules'>

export function recurringKey(householdId: string) {
  return ['recurring', householdId]
}

export function useRecurringRules() {
  const householdId = useHouseholdId()
  return useQuery({
    queryKey: recurringKey(householdId),
    queryFn: async (): Promise<RecurringRule[]> => {
      const { data, error } = await supabase
        .from('recurring_rules')
        .select('*')
        .eq('is_active', true)
        .order('next_due_date', { nullsFirst: false })
      if (error) throw error
      return data
    },
  })
}

function ruleShape(r: RecurringRule): RecurrenceRule {
  return {
    frequency: r.frequency as RecurrenceRule['frequency'],
    interval_count: r.interval_count,
    anchor_date: r.anchor_date,
    day_of_month: r.day_of_month,
    end_date: r.end_date,
  }
}

export function useUpsertRecurringRule() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<'recurring_rules'>, 'household_id'>) => {
      // Maintain next_due_date so the timeline and dashboard can query it cheaply.
      const rule = ruleShape(input as unknown as RecurringRule)
      const next =
        nextOccurrenceAfter(rule, format(addDays(new Date(input.anchor_date), -1), 'yyyy-MM-dd')) ??
        input.anchor_date
      const { data, error } = await supabase
        .from('recurring_rules')
        .insert({ ...input, household_id: householdId, next_due_date: next })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recurringKey(householdId) }),
  })
}

export function useUpdateRecurringRule() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<'recurring_rules'> }) => {
      const { error } = await supabase.from('recurring_rules').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recurringKey(householdId) }),
  })
}

export function useDeleteRecurringRule() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recurring_rules').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recurringKey(householdId) }),
  })
}

export type Occurrence = {
  ruleId: string
  name: string
  type: 'income' | 'expense'
  amount: number // positive magnitude
  signedAmount: number // + income / - expense
  date: string
  paid: boolean
  runningBalance: number
}

/**
 * Project every active rule's occurrences over the next `days`, with a running
 * balance seeded from current liquid cash (tracked asset accounts), so cash
 * dips are visible before they happen (brief §8.5). Occurrences already posted
 * (a transaction links back via recurring_rule_id on that date) are marked paid.
 */
export function useTimeline(days: number) {
  const householdId = useHouseholdId()
  const { data: rules } = useRecurringRules()

  return useQuery({
    // Depends on rules and, via the queryFn, on live balances + posted rows.
    // It's invalidated by the recurring prefix on mark-as-paid; the starting
    // balance is fetched fresh inside the queryFn so it never reads a stale
    // account balance from a sibling hook's cache.
    queryKey: [...recurringKey(householdId), 'timeline', days, rules?.length],
    enabled: !!rules,
    queryFn: async (): Promise<Occurrence[]> => {
      const from = todayIso()
      const to = format(addDays(new Date(), days), 'yyyy-MM-dd')

      // Seed the running balance from current liquid cash — tracked asset
      // accounts only (statement-tracked super/property aren't spendable cash).
      // Fetched fresh (accounts meta + balances view) so a just-posted
      // transaction is reflected immediately.
      const [acctRes, balRes] = await Promise.all([
        supabase.from('accounts').select('id, class, balance_mode').eq('archived', false),
        supabase.from('account_balances').select('account_id, balance'),
      ])
      if (acctRes.error) throw acctRes.error
      if (balRes.error) throw balRes.error
      const balanceByAccount = new Map(balRes.data.map((b) => [b.account_id, b.balance ?? 0]))
      const startingBalance = acctRes.data
        .filter((a) => a.class === 'asset' && a.balance_mode === 'tracked')
        .reduce((sum, a) => sum + (balanceByAccount.get(a.id) ?? 0), 0)

      // Which occurrences are already posted? Match by (rule, date).
      const { data: posted, error } = await supabase
        .from('transactions')
        .select('recurring_rule_id, txn_date')
        .not('recurring_rule_id', 'is', null)
        .gte('txn_date', from)
        .lte('txn_date', to)
      if (error) throw error
      const paidKeys = new Set((posted ?? []).map((p) => `${p.recurring_rule_id}|${p.txn_date}`))

      const flat = (rules ?? []).flatMap((rule) =>
        expandOccurrences(ruleShape(rule), from, to).map((occ) => {
          const signedAmount = rule.type === 'expense' ? -rule.amount : rule.amount
          return {
            ruleId: rule.id,
            name: rule.name,
            type: rule.type as 'income' | 'expense',
            amount: rule.amount,
            signedAmount,
            date: occ.date,
            paid: paidKeys.has(`${rule.id}|${occ.date}`),
          }
        }),
      )
      flat.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

      let balance = startingBalance
      return flat.map((o) => {
        // Unpaid occurrences move the projected balance; paid ones already hit
        // the real balance, so don't double-count them.
        if (!o.paid) balance += o.signedAmount
        return { ...o, runningBalance: balance }
      })
    },
  })
}

export function useMarkOccurrencePaid() {
  const householdId = useHouseholdId()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ rule, date }: { rule: RecurringRule; date: string }) => {
      if (!rule.account_id) throw new Error('Add an account to this rule before marking it paid')
      const signedAmount = rule.type === 'expense' ? -rule.amount : rule.amount
      const { error } = await supabase.from('transactions').insert({
        household_id: householdId,
        account_id: rule.account_id,
        txn_date: date,
        amount: signedAmount,
        type: rule.type,
        category_id: rule.category_id,
        description: rule.name,
        recurring_rule_id: rule.id,
        created_by: user?.id ?? null,
      })
      if (error) throw error

      // Advance the maintained pointer to the next occurrence after this one.
      const next = nextOccurrenceAfter(ruleShape(rule), date)
      await supabase.from('recurring_rules').update({ next_due_date: next }).eq('id', rule.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringKey(householdId) })
      queryClient.invalidateQueries({ queryKey: ['transactions', householdId] })
      queryClient.invalidateQueries({ queryKey: accountsKey(householdId) })
      queryClient.invalidateQueries({ queryKey: ['net-worth', householdId] })
    },
  })
}
