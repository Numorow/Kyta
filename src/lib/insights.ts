import type { CategoryMonthSpend, MonthlyCashflow } from '@/features/reports/useReports'

// Pure insight derivations over the report aggregates (extends Reports). Fed by
// the rows useReports already fetches — no extra queries. Kept pure/tested in
// the repo's lib style (money.ts, period.ts, recurrence.ts).

export type TopMover = {
  category: string
  prev: number
  curr: number
  delta: number // curr − prev (positive = spent more)
  isNew: boolean // no spend in the prior month
}

export type SavingsRatePoint = { month: string; rate: number | null }

/**
 * Biggest category spend changes between the two most recent months in the
 * window. Ranked by absolute dollar delta (a category new this month ranks by
 * its full amount). A category absent from a month counts as 0 spend there.
 * Note: the latest month is usually partial, so this is "this month so far".
 */
export function topMovers(
  rows: CategoryMonthSpend[],
  months: string[],
  limit = 6,
): TopMover[] {
  if (months.length < 2) return []
  const curr = months[months.length - 1]
  const prev = months[months.length - 2]
  const byCat = new Map<string, { prev: number; curr: number }>()
  for (const r of rows) {
    if (r.month !== curr && r.month !== prev) continue
    const entry = byCat.get(r.category) ?? { prev: 0, curr: 0 }
    if (r.month === curr) entry.curr += r.spend
    else entry.prev += r.spend
    byCat.set(r.category, entry)
  }
  return [...byCat.entries()]
    .map(([category, v]) => ({
      category,
      prev: v.prev,
      curr: v.curr,
      delta: v.curr - v.prev,
      isNew: v.prev === 0,
    }))
    .filter((m) => Math.abs(m.delta) >= 0.005)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, limit)
}

/**
 * Savings rate per month: (income − expense) / income. Returns null when income
 * is ≤ 0 (rate is undefined) so the chart can gap it rather than plot a
 * misleading value.
 */
export function savingsRateSeries(monthly: MonthlyCashflow[]): SavingsRatePoint[] {
  return monthly.map((m) => ({
    month: m.month,
    rate: m.income > 0 ? (m.income - m.expense) / m.income : null,
  }))
}
