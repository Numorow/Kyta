import { addDays, format } from 'date-fns'
import { expandOccurrences, type RecurrenceRule } from './recurrence'

// Cashflow forecast (next phase, brief §8.5). A pure superset of the recurring
// bills timeline: project a daily running balance forward from current liquid
// cash by applying every active recurring occurrence, so cash dips are visible
// before they happen. Everything is date-only (yyyy-MM-dd) computed from
// local-midnight Dates — no timezone/DST drift, matching recurrence.ts.

export type ForecastRule = RecurrenceRule & {
  id: string
  name: string
  type: 'income' | 'expense'
  amount: number // positive magnitude
}

export type ForecastEvent = {
  ruleId: string
  name: string
  type: 'income' | 'expense'
  signedAmount: number // + income / − expense
  paid: boolean // already posted (a transaction links back on this date)
}

export type ForecastDay = {
  date: string // yyyy-MM-dd — every calendar day in [asOf, asOf+days]
  opening: number
  events: ForecastEvent[]
  delta: number // Σ signedAmount of UNPAID events this day
  closing: number // opening + delta (the projected running balance)
  belowThreshold: boolean
}

export type CashDip = {
  date: string
  balance: number
  daysUntil: number // from asOf
}

export type Forecast = {
  startingBalance: number
  threshold: number
  series: ForecastDay[]
  minPoint: { date: string; balance: number }
  dips: CashDip[] // one entry per contiguous below-threshold run (its trough)
  crossesZero: boolean
}

export type BuildForecastInput = {
  startingBalance: number
  asOf: string // yyyy-MM-dd (caller passes todayIso())
  days: number // horizon, e.g. 30 | 60 | 90
  rules: ForecastRule[]
  paidKeys: Set<string> // "${ruleId}|${date}"
  threshold?: number // default 0
}

function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((toDate(toIso).getTime() - toDate(fromIso).getTime()) / 86_400_000)
}

/**
 * Project a daily running balance over [asOf, asOf+days] (inclusive). Paid
 * occurrences already hit the seeded balance, so they don't move the projection
 * (they'd be double-counted otherwise). Pure and deterministic — no argless
 * `new Date()` — so tests can pin `asOf`.
 */
export function buildForecast(input: BuildForecastInput): Forecast {
  const { startingBalance, asOf, days, rules, paidKeys } = input
  const threshold = input.threshold ?? 0
  const to = format(addDays(toDate(asOf), days), 'yyyy-MM-dd')

  // Expand every rule into occurrences within [asOf, to], bucketed by date.
  // Same-date ordering follows rule order, matching the old timeline.
  const eventsByDate = new Map<string, ForecastEvent[]>()
  for (const rule of rules) {
    const signed = rule.type === 'expense' ? -rule.amount : rule.amount
    for (const occ of expandOccurrences(rule, asOf, to)) {
      const event: ForecastEvent = {
        ruleId: rule.id,
        name: rule.name,
        type: rule.type,
        signedAmount: signed,
        paid: paidKeys.has(`${rule.id}|${occ.date}`),
      }
      const bucket = eventsByDate.get(occ.date)
      if (bucket) bucket.push(event)
      else eventsByDate.set(occ.date, [event])
    }
  }

  // Dense daily spine so the chart is continuous even on event-less days.
  const series: ForecastDay[] = []
  let balance = startingBalance
  let minPoint: { date: string; balance: number } | null = null
  let crossesZero = false
  for (let i = 0; i <= days; i++) {
    const date = format(addDays(toDate(asOf), i), 'yyyy-MM-dd')
    const events = eventsByDate.get(date) ?? []
    const opening = balance
    const delta = events.reduce((sum, e) => (e.paid ? sum : sum + e.signedAmount), 0)
    const closing = opening + delta
    balance = closing
    if (closing < 0) crossesZero = true
    if (minPoint === null || closing < minPoint.balance) minPoint = { date, balance: closing }
    series.push({ date, opening, events, delta, closing, belowThreshold: closing < threshold })
  }

  // Dips: one entry per contiguous below-threshold run, at its lowest point.
  const dips: CashDip[] = []
  let trough: { date: string; balance: number } | null = null
  const flush = () => {
    if (trough) {
      dips.push({ date: trough.date, balance: trough.balance, daysUntil: daysBetween(asOf, trough.date) })
      trough = null
    }
  }
  for (const day of series) {
    if (day.belowThreshold) {
      if (!trough || day.closing < trough.balance) trough = { date: day.date, balance: day.closing }
    } else {
      flush()
    }
  }
  flush()

  return {
    startingBalance,
    threshold,
    series,
    minPoint: minPoint ?? { date: asOf, balance: startingBalance },
    dips,
    crossesZero,
  }
}
