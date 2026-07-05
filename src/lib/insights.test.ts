import { describe, it, expect } from 'vitest'
import { savingsRateSeries, topMovers } from './insights'
import type { CategoryMonthSpend, MonthlyCashflow } from '@/features/reports/useReports'

describe('topMovers', () => {
  const rows: CategoryMonthSpend[] = [
    { category: 'Groceries', month: '2026-05', spend: 500 },
    { category: 'Groceries', month: '2026-06', spend: 650 }, // +150
    { category: 'Dining', month: '2026-05', spend: 200 },
    { category: 'Dining', month: '2026-06', spend: 120 }, // −80
    { category: 'Travel', month: '2026-06', spend: 900 }, // new (+900)
    { category: 'Rent', month: '2026-05', spend: 1000 },
    { category: 'Rent', month: '2026-06', spend: 1000 }, // no change → excluded
  ]
  const months = ['2026-05', '2026-06']

  it('ranks by absolute dollar delta and flags new categories', () => {
    const movers = topMovers(rows, months)
    expect(movers.map((m) => m.category)).toEqual(['Travel', 'Groceries', 'Dining'])
    expect(movers[0]).toMatchObject({ category: 'Travel', prev: 0, curr: 900, delta: 900, isNew: true })
    expect(movers[1]).toMatchObject({ category: 'Groceries', delta: 150, isNew: false })
    expect(movers[2]).toMatchObject({ category: 'Dining', delta: -80 })
  })

  it('excludes unchanged categories and respects the limit', () => {
    expect(topMovers(rows, months).some((m) => m.category === 'Rent')).toBe(false)
    expect(topMovers(rows, months, 1)).toHaveLength(1)
  })

  it('returns nothing with fewer than two months', () => {
    expect(topMovers(rows, ['2026-06'])).toEqual([])
  })
})

describe('savingsRateSeries', () => {
  const monthly: MonthlyCashflow[] = [
    { month: '2026-05', income: 5000, expense: 4000, net: 1000 }, // 0.2
    { month: '2026-06', income: 0, expense: 300, net: -300 }, // null (no income)
  ]

  it('computes (income − expense)/income and nulls out zero-income months', () => {
    const series = savingsRateSeries(monthly)
    expect(series[0]).toEqual({ month: '2026-05', rate: 0.2 })
    expect(series[1]).toEqual({ month: '2026-06', rate: null })
  })
})
