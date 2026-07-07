import { useQuery } from '@tanstack/react-query'
import { format, subMonths, startOfMonth } from 'date-fns'
import { useHouseholdId } from '@/features/household/HouseholdContext'
import { supabase } from '@/lib/supabase'
import { todayIso } from '@/lib/money'

export type CategorySpend = { category: string; spend: number }
export type MonthlyCashflow = { month: string; income: number; expense: number; net: number }
export type CategoryMonthSpend = { category: string; month: string; spend: number }
export type PersonCashflow = { userId: string | null; income: number; expense: number; net: number }

export type ReportData = {
  from: string
  to: string
  spendByCategory: CategorySpend[]
  monthly: MonthlyCashflow[]
  byCategoryMonth: CategoryMonthSpend[] // per-(category × month) expense, for insights
  byPerson: PersonCashflow[] // income/expense/net per member who added it (2Up)
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
        .select('txn_date, amount, type, created_by, categories(name)')
        .neq('type', 'transfer')
        .gte('txn_date', from)
        .lte('txn_date', to)
      if (error) throw error

      const rows = data as unknown as {
        txn_date: string
        amount: number
        type: string
        created_by: string | null
        categories: { name: string } | null
      }[]

      // Spend by category (expenses only; amounts are negative → negate).
      const spendMap = new Map<string, number>()
      // Income vs expense per calendar month.
      const monthMap = new Map<string, { income: number; expense: number }>()
      // Per-(category × month) expense for insights (MoM trend, top movers).
      const catMonthMap = new Map<string, number>() // `${category}|${month}` → spend
      // Income/expense per member who added the transaction (2Up).
      const personMap = new Map<string | null, { income: number; expense: number }>()

      for (const r of rows) {
        const amt = Number(r.amount)
        const month = r.txn_date.slice(0, 7) // yyyy-MM
        const bucket = monthMap.get(month) ?? { income: 0, expense: 0 }
        const pbucket = personMap.get(r.created_by) ?? { income: 0, expense: 0 }
        if (r.type === 'income') {
          bucket.income += amt
          pbucket.income += amt
        } else if (r.type === 'expense') {
          bucket.expense += -amt
          pbucket.expense += -amt
          const name = r.categories?.name ?? 'Uncategorised'
          spendMap.set(name, (spendMap.get(name) ?? 0) + -amt)
          const key = `${name}|${month}`
          catMonthMap.set(key, (catMonthMap.get(key) ?? 0) + -amt)
        }
        monthMap.set(month, bucket)
        personMap.set(r.created_by, pbucket)
      }

      const spendByCategory = [...spendMap.entries()]
        .map(([category, spend]) => ({ category, spend }))
        .filter((s) => s.spend > 0)
        .sort((a, b) => b.spend - a.spend)

      const monthly = [...monthMap.entries()]
        .map(([month, v]) => ({ month, income: v.income, expense: v.expense, net: v.income - v.expense }))
        .sort((a, b) => (a.month < b.month ? -1 : 1))

      // Split on the LAST '|' so category names containing '|' survive.
      const byCategoryMonth = [...catMonthMap.entries()].map(([key, spend]) => {
        const sep = key.lastIndexOf('|')
        return { category: key.slice(0, sep), month: key.slice(sep + 1), spend }
      })

      const byPerson = [...personMap.entries()].map(([userId, v]) => ({
        userId,
        income: v.income,
        expense: v.expense,
        net: v.income - v.expense,
      }))

      return { from, to, spendByCategory, monthly, byCategoryMonth, byPerson }
    },
  })
}
