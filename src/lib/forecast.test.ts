import { describe, it, expect } from 'vitest'
import { buildForecast, type ForecastRule } from './forecast'

function rule(partial: Partial<ForecastRule>): ForecastRule {
  return {
    id: 'r1',
    name: 'Rule',
    type: 'expense',
    amount: 100,
    frequency: 'monthly',
    interval_count: 1,
    anchor_date: '2026-01-15',
    day_of_month: 15,
    end_date: null,
    ...partial,
  }
}

const dayFor = (f: ReturnType<typeof buildForecast>, date: string) =>
  f.series.find((d) => d.date === date)

describe('buildForecast — spine & running balance', () => {
  it('produces a dense inclusive daily spine [asOf, asOf+days]', () => {
    const f = buildForecast({
      startingBalance: 1000,
      asOf: '2026-01-01',
      days: 30,
      rules: [],
      paidKeys: new Set(),
    })
    expect(f.series).toHaveLength(31)
    expect(f.series[0].date).toBe('2026-01-01')
    expect(f.series[30].date).toBe('2026-01-31')
    // No rules → flat line at the starting balance.
    expect(f.series.every((d) => d.closing === 1000)).toBe(true)
    expect(f.minPoint).toEqual({ date: '2026-01-01', balance: 1000 })
  })

  it('applies a monthly expense on its day and holds after', () => {
    const f = buildForecast({
      startingBalance: 1000,
      asOf: '2026-01-01',
      days: 30,
      rules: [rule({ amount: 400, anchor_date: '2026-01-15', day_of_month: 15 })],
      paidKeys: new Set(),
    })
    expect(dayFor(f, '2026-01-14')!.closing).toBe(1000)
    expect(dayFor(f, '2026-01-15')!.closing).toBe(600)
    expect(dayFor(f, '2026-01-31')!.closing).toBe(600)
    expect(f.minPoint).toEqual({ date: '2026-01-15', balance: 600 })
  })

  it('accumulates a fortnightly income across the window', () => {
    const f = buildForecast({
      startingBalance: 0,
      asOf: '2026-01-01',
      days: 30,
      rules: [
        rule({ type: 'income', amount: 1000, frequency: 'fortnightly', anchor_date: '2026-01-01', day_of_month: null }),
      ],
      paidKeys: new Set(),
    })
    expect(dayFor(f, '2026-01-01')!.closing).toBe(1000)
    expect(dayFor(f, '2026-01-15')!.closing).toBe(2000)
    expect(dayFor(f, '2026-01-29')!.closing).toBe(3000)
  })
})

describe('buildForecast — paid, dips, threshold', () => {
  it('does not double-count a paid occurrence', () => {
    const f = buildForecast({
      startingBalance: 1000,
      asOf: '2026-01-01',
      days: 30,
      rules: [rule({ amount: 400, anchor_date: '2026-01-15', day_of_month: 15 })],
      paidKeys: new Set(['r1|2026-01-15']),
    })
    // The 15th is already posted (in the seed), so the projection never dips.
    expect(dayFor(f, '2026-01-15')!.delta).toBe(0)
    expect(f.series.every((d) => d.closing === 1000)).toBe(true)
  })

  it('detects a below-threshold dip and zero crossing', () => {
    const f = buildForecast({
      startingBalance: 100,
      asOf: '2026-01-01',
      days: 30,
      rules: [rule({ amount: 400, anchor_date: '2026-01-10', day_of_month: 10 })],
      paidKeys: new Set(),
    })
    expect(f.crossesZero).toBe(true)
    expect(f.dips).toHaveLength(1)
    expect(f.dips[0]).toEqual({ date: '2026-01-10', balance: -300, daysUntil: 9 })
  })

  it('collapses a contiguous below-threshold run into one dip at its trough', () => {
    const f = buildForecast({
      startingBalance: 500,
      asOf: '2026-01-01',
      days: 40,
      rules: [
        rule({ id: 'a', amount: 400, anchor_date: '2026-01-05', day_of_month: 5 }),
        rule({ id: 'b', amount: 300, anchor_date: '2026-01-10', day_of_month: 10 }),
        // income later lifts it back above threshold, ending the run
        rule({ id: 'c', type: 'income', amount: 1000, anchor_date: '2026-01-20', day_of_month: 20 }),
      ],
      paidKeys: new Set(),
    })
    // Below 0 from the 10th (500-400-300=-200) until the 20th (+1000=800).
    expect(f.dips).toHaveLength(1)
    expect(f.dips[0].balance).toBe(-200)
    expect(f.dips[0].date).toBe('2026-01-10')
  })
})

describe('buildForecast — month-end clamp inherited from recurrence', () => {
  it('clamps a 31st monthly rule into February', () => {
    const f = buildForecast({
      startingBalance: 1000,
      asOf: '2026-02-01',
      days: 28,
      rules: [rule({ amount: 100, frequency: 'monthly', anchor_date: '2026-01-31', day_of_month: 31 })],
      paidKeys: new Set(),
    })
    // Feb 2026 has 28 days → the "31st" occurrence lands on the 28th.
    expect(dayFor(f, '2026-02-27')!.closing).toBe(1000)
    expect(dayFor(f, '2026-02-28')!.closing).toBe(900)
  })
})
