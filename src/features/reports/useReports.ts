import { useQuery } from '@tanstack/react-query'
import { format, subMonths, startOfMonth } from 'date-fns'
import { useHouseholdId } from '@/features/household/HouseholdContext'
import { supabase } from '@/lib/supabase'
import { todayIso } from '@/lib/money'

export type CategorySpend = { category: string; spend: number }
export type MonthlyCashflow = { month: string; income: number; expense: number; net: number }

export type ReportData = {
  from: string
  to: string
  spendByCategory: CategorySpend[]
  monthly: MonthlyCashflow[]
}

/**
 * Report aggregates over the last `months`. Computed client-side from the
 * RLS-filtered transactions (transfers excluded, since they net to zero and
 * aren't income or expense — brief §10). A personal household's transaction
 * volume is small, so a single fetch + in-memory grouping is ample.
 */
export function useReports(months: number) {
  const householdId = useHouseholdId()
  const to = todayIso()
  const from = format(startOfMonth(subMonths(new Date(), months - 1)), 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['reports', householdId, months],
    queryFn: async (): Promise<ReportData> => {
      const { data, error } = await supabase
        .from('transactions')
        .select('txn_date, amount, type, categories(name)')
        .neq('type', 'transfer')
        .gte('txn_date', from)
        .lte('txn_date', to)
      if (error) throw error

      const rows = data as unknown as {
        txn_date: string
        amount: number
        type: string
        categories: { name: string } | null
      }[]

      // Spend by category (expenses only; amounts are negative → negate).
      const spendMap = new Map<string, number>()
      // Income vs expense per calendar month.
      const monthMap = new Map<string, { income: number; expense: number }>()

      for (const r of rows) {
        const amt = Number(r.amount)
        const month = r.txn_date.slice(0, 7) // yyyy-MM
        const bucket = monthMap.get(month) ?? { income: 0, expense: 0 }
        if (r.type === 'income') {
          bucket.income += amt
        } else if (r.type === 'expense') {
          bucket.expense += -amt
          const name = r.categories?.name ?? 'Uncategorised'
          spendMap.set(name, (spendMap.get(name) ?? 0) + -amt)
        }
        monthMap.set(month, bucket)
      }

      const spendByCategory = [...spendMap.entries()]
        .map(([category, spend]) => ({ category, spend }))
        .filter((s) => s.spend > 0)
        .sort((a, b) => b.spend - a.spend)

      const monthly = [...monthMap.entries()]
        .map(([month, v]) => ({ month, income: v.income, expense: v.expense, net: v.income - v.expense }))
        .sort((a, b) => (a.month < b.month ? -1 : 1))

      return { from, to, spendByCategory, monthly }
    },
  })
}
