import { useQuery } from '@tanstack/react-query'
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns'
import { useHouseholdId } from '@/features/household/HouseholdContext'
import { supabase } from '@/lib/supabase'

export type CashflowPeriod = 'month' | 'fortnight'
export type CashflowSummary = { income: number; expense: number; from: string; to: string }

function bounds(period: CashflowPeriod): { from: string; to: string } {
  const now = new Date()
  if (period === 'month') {
    return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') }
  }
  // Trailing fortnight (last 14 days inclusive).
  return { from: format(addDays(now, -13), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') }
}

/** Income in vs expenses out for the current month or trailing fortnight. */
export function useCashflowSummary(period: CashflowPeriod) {
  const householdId = useHouseholdId()
  const { from, to } = bounds(period)

  return useQuery({
    queryKey: ['cashflow-summary', householdId, period],
    queryFn: async (): Promise<CashflowSummary> => {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type')
        .neq('type', 'transfer')
        .gte('txn_date', from)
        .lte('txn_date', to)
      if (error) throw error

      let income = 0
      let expense = 0
      for (const r of data) {
        const amt = Number(r.amount)
        if (r.type === 'income') income += amt
        else if (r.type === 'expense') expense += -amt
      }
      return { income, expense, from, to }
    },
  })
}
