import { describe, it, expect } from 'vitest'
import { periodBounds, nextPeriodStart, priorPeriods } from './period'

describe('periodBounds', () => {
  it('monthly = calendar month containing ref', () => {
    expect(periodBounds('monthly', '2026-07-15', '2026-01-01')).toEqual({
      start: '2026-07-01',
      end: '2026-07-31',
    })
    // February in a non-leap year clamps to the 28th
    expect(periodBounds('monthly', '2026-02-10', '2026-01-01')).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    })
  })

  it('annual = calendar year', () => {
    expect(periodBounds('annual', '2026-07-15', '2026-01-01')).toEqual({
      start: '2026-01-01',
      end: '2026-12-31',
    })
  })

  it('weekly = Monday-start week containing ref', () => {
    // 2026-07-15 is a Wednesday → week is Mon 13th to Sun 19th
    expect(periodBounds('weekly', '2026-07-15', '2026-01-01')).toEqual({
      start: '2026-07-13',
      end: '2026-07-19',
    })
  })

  it('fortnightly steps in true 14-day cells from the anchor', () => {
    const anchor = '2026-07-01'
    // ref on the anchor day → first cell
    expect(periodBounds('fortnightly', '2026-07-01', anchor)).toEqual({
      start: '2026-07-01',
      end: '2026-07-14',
    })
    // 13 days in → still first cell
    expect(periodBounds('fortnightly', '2026-07-14', anchor)).toEqual({
      start: '2026-07-01',
      end: '2026-07-14',
    })
    // 14 days in → second cell
    expect(periodBounds('fortnightly', '2026-07-15', anchor)).toEqual({
      start: '2026-07-15',
      end: '2026-07-28',
    })
    // 28 days in → third cell (proves it's not "2 weeks of a month")
    expect(periodBounds('fortnightly', '2026-07-29', anchor)).toEqual({
      start: '2026-07-29',
      end: '2026-08-11',
    })
  })

  it('fortnightly handles dates before the anchor', () => {
    expect(periodBounds('fortnightly', '2026-06-30', '2026-07-01')).toEqual({
      start: '2026-06-17',
      end: '2026-06-30',
    })
  })
})

describe('nextPeriodStart', () => {
  it('advances by one cell per period type', () => {
    expect(nextPeriodStart('weekly', '2026-07-13')).toBe('2026-07-20')
    expect(nextPeriodStart('fortnightly', '2026-07-01')).toBe('2026-07-15')
    expect(nextPeriodStart('monthly', '2026-07-01')).toBe('2026-08-01')
    expect(nextPeriodStart('annual', '2026-01-01')).toBe('2027-01-01')
  })
})

describe('priorPeriods', () => {
  it('lists completed monthly windows before the current one', () => {
    const priors = priorPeriods('monthly', '2026-05-01', '2026-07-15')
    expect(priors).toEqual([
      { start: '2026-05-01', end: '2026-05-31' },
      { start: '2026-06-01', end: '2026-06-30' },
    ])
  })

  it('is empty when ref is in the first period', () => {
    expect(priorPeriods('monthly', '2026-07-01', '2026-07-20')).toEqual([])
  })

  it('lists completed fortnightly windows', () => {
    const priors = priorPeriods('fortnightly', '2026-07-01', '2026-07-29')
    expect(priors).toEqual([
      { start: '2026-07-01', end: '2026-07-14' },
      { start: '2026-07-15', end: '2026-07-28' },
    ])
  })
})
