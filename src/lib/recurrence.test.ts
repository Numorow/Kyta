import { describe, it, expect } from 'vitest'
import {
  expandOccurrences,
  nextOccurrenceAfter,
  type RecurrenceRule,
} from './recurrence'

function rule(partial: Partial<RecurrenceRule>): RecurrenceRule {
  return {
    frequency: 'monthly',
    interval_count: 1,
    anchor_date: '2026-01-01',
    day_of_month: null,
    end_date: null,
    ...partial,
  }
}

const dates = (occ: { date: string }[]) => occ.map((o) => o.date)

describe('expandOccurrences — weekly', () => {
  it('steps every 7 days from the anchor', () => {
    const r = rule({ frequency: 'weekly', anchor_date: '2026-07-06' })
    expect(dates(expandOccurrences(r, '2026-07-01', '2026-07-31'))).toEqual([
      '2026-07-06',
      '2026-07-13',
      '2026-07-20',
      '2026-07-27',
    ])
  })
  it('honours interval_count (every 2 weeks)', () => {
    const r = rule({ frequency: 'weekly', interval_count: 2, anchor_date: '2026-07-06' })
    expect(dates(expandOccurrences(r, '2026-07-01', '2026-08-05'))).toEqual([
      '2026-07-06',
      '2026-07-20',
      '2026-08-03',
    ])
  })
})

describe('expandOccurrences — fortnightly (anchor + 14n, not "2 weeks of monthly")', () => {
  it('lands on exact 14-day multiples across a 60-day window', () => {
    const r = rule({ frequency: 'fortnightly', anchor_date: '2026-07-03' })
    // A fortnightly wage: anchor + 14, 28, 42, 56 days
    expect(dates(expandOccurrences(r, '2026-07-01', '2026-08-31'))).toEqual([
      '2026-07-03',
      '2026-07-17',
      '2026-07-31',
      '2026-08-14',
      '2026-08-28',
    ])
  })
  it('does not drift by month length', () => {
    // Feb→Mar boundary: 14-day steps stay exact, unlike a monthly approximation.
    const r = rule({ frequency: 'fortnightly', anchor_date: '2026-02-06' })
    expect(dates(expandOccurrences(r, '2026-02-01', '2026-03-31'))).toEqual([
      '2026-02-06',
      '2026-02-20',
      '2026-03-06',
      '2026-03-20',
    ])
  })
})

describe('expandOccurrences — monthly with day-of-month clamp', () => {
  it('clamps a 31st rule to shorter months (28/30)', () => {
    const r = rule({ frequency: 'monthly', anchor_date: '2026-01-31', day_of_month: 31 })
    expect(dates(expandOccurrences(r, '2026-01-01', '2026-05-31'))).toEqual([
      '2026-01-31',
      '2026-02-28', // clamped
      '2026-03-31',
      '2026-04-30', // clamped
      '2026-05-31',
    ])
  })
  it('clamps a 29th rule in a non-leap February', () => {
    const r = rule({ frequency: 'monthly', anchor_date: '2026-01-29', day_of_month: 29 })
    expect(dates(expandOccurrences(r, '2026-02-01', '2026-02-28'))).toEqual(['2026-02-28'])
  })
  it('a mortgage on the 15th projects cleanly across a 60-day window', () => {
    const r = rule({ frequency: 'monthly', anchor_date: '2026-07-15', day_of_month: 15 })
    // Window ends 13 Sep, so the 15 Sep occurrence is excluded.
    expect(dates(expandOccurrences(r, '2026-07-01', '2026-09-13'))).toEqual([
      '2026-07-15',
      '2026-08-15',
    ])
  })
})

describe('expandOccurrences — quarterly / annually', () => {
  it('quarterly adds 3 months', () => {
    const r = rule({ frequency: 'quarterly', anchor_date: '2026-01-15', day_of_month: 15 })
    expect(dates(expandOccurrences(r, '2026-01-01', '2026-12-31'))).toEqual([
      '2026-01-15',
      '2026-04-15',
      '2026-07-15',
      '2026-10-15',
    ])
  })
  it('annually adds a year', () => {
    const r = rule({ frequency: 'annually', anchor_date: '2026-06-30' })
    expect(dates(expandOccurrences(r, '2026-01-01', '2028-12-31'))).toEqual([
      '2026-06-30',
      '2027-06-30',
      '2028-06-30',
    ])
  })
})

describe('expandOccurrences — bounds', () => {
  it('never emits before the anchor', () => {
    const r = rule({ frequency: 'weekly', anchor_date: '2026-07-15' })
    expect(dates(expandOccurrences(r, '2026-07-01', '2026-07-14'))).toEqual([])
  })
  it('stops at end_date inclusive', () => {
    const r = rule({ frequency: 'weekly', anchor_date: '2026-07-06', end_date: '2026-07-20' })
    expect(dates(expandOccurrences(r, '2026-07-01', '2026-08-31'))).toEqual([
      '2026-07-06',
      '2026-07-13',
      '2026-07-20',
    ])
  })
})

describe('nextOccurrenceAfter', () => {
  it('returns the next fortnightly date strictly after a given day', () => {
    const r = rule({ frequency: 'fortnightly', anchor_date: '2026-07-03' })
    expect(nextOccurrenceAfter(r, '2026-07-03')).toBe('2026-07-17')
    expect(nextOccurrenceAfter(r, '2026-07-10')).toBe('2026-07-17')
  })
})
