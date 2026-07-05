import { useQuery } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import { useHouseholdId } from '@/features/household/HouseholdContext'
import { supabase } from '@/lib/supabase'
import { todayIso } from '@/lib/money'
import { buildForecast, type Forecast, type ForecastRule } from '@/lib/forecast'
import { ruleShape, useRecurringRules } from '@/features/recurring/useRecurring'

/**
 * Forward cashflow forecast: project spendable cash over the next `days` from
 * current liquid balances + every active recurring occurrence. Shares the pure
 * buildForecast engine (and its exact liquid-seed + paid-keys logic) with the
 * bills timeline, so the two never diverge.
 */
export function useForecast(days: number, threshold = 0) {
  const householdId = useHouseholdId()
  const { data: rules } = useRecurringRules()

  return useQuery({
    queryKey: ['forecast', householdId, days, threshold, rules?.length],
    enabled: !!rules,
    queryFn: async (): Promise<Forecast> => {
      const asOf = todayIso()
      const to = format(addDays(new Date(), days), 'yyyy-MM-dd')

      // Seed from spendable cash — tracked asset accounts only (statement-mode
      // super/property isn't liquid). Fetched fresh so a just-posted bill shows.
      const [acctRes, balRes] = await Promise.all([
        supabase.from('accounts').select('id, class, balance_mode').eq('archived', false),
        supabase.from('account_balances').select('account_id, balance'),
      ])
      if (acctRes.error) throw acctRes.error
      if (balRes.error) throw balRes.error
      const balanceByAccount = new Map(
        balRes.data.map((b) => [b.account_id, Number(b.balance ?? 0)]),
      )
      const startingBalance = acctRes.data
        .filter((a) => a.class === 'asset' && a.balance_mode === 'tracked')
        .reduce((sum, a) => sum + (balanceByAccount.get(a.id) ?? 0), 0)

      // Occurrences already posted (a transaction links back on that date) are
      // in the seed already, so the engine must not re-add them.
      const { data: posted, error } = await supabase
        .from('transactions')
        .select('recurring_rule_id, txn_date')
        .not('recurring_rule_id', 'is', null)
        .gte('txn_date', asOf)
        .lte('txn_date', to)
      if (error) throw error
      const paidKeys = new Set((posted ?? []).map((p) => `${p.recurring_rule_id}|${p.txn_date}`))

      const forecastRules: ForecastRule[] = (rules ?? []).map((r) => ({
        ...ruleShape(r),
        id: r.id,
        name: r.name,
        type: r.type as 'income' | 'expense',
        amount: r.amount,
      }))

      return buildForecast({ startingBalance, asOf, days, rules: forecastRules, paidKeys, threshold })
    },
  })
}
