import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'

// Budget period math (brief §8.4). All date-only (yyyy-MM-dd strings) computed
// in local time with no clock component, so there's no timezone drift.

export type BudgetPeriod = 'weekly' | 'fortnightly' | 'monthly' | 'annual'

export type PeriodBounds = { start: string; end: string }

function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function toIso(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/**
 * The period window containing `ref`. Fortnightly is anchored to the budget's
 * start_date and steps in true 14-day cycles (not "half a month"); weekly uses
 * a Monday start; monthly/annual use calendar boundaries.
 */
export function periodBounds(period: BudgetPeriod, refIso: string, anchorIso: string): PeriodBounds {
  const ref = toDate(refIso)
  switch (period) {
    case 'weekly':
      return {
        start: toIso(startOfWeek(ref, { weekStartsOn: 1 })),
        end: toIso(endOfWeek(ref, { weekStartsOn: 1 })),
      }
    case 'fortnightly': {
      const anchor = toDate(anchorIso)
      const days = differenceInCalendarDays(ref, anchor)
      // Floor toward negative infinity so dates before the anchor still land in
      // a clean 14-day cell.
      const cycle = Math.floor(days / 14)
      const start = addDays(anchor, cycle * 14)
      return { start: toIso(start), end: toIso(addDays(start, 13)) }
    }
    case 'monthly':
      return { start: toIso(startOfMonth(ref)), end: toIso(endOfMonth(ref)) }
    case 'annual':
      return { start: toIso(startOfYear(ref)), end: toIso(endOfYear(ref)) }
  }
}

/** Advance a period window by one step (used to walk prior periods for rollover). */
export function nextPeriodStart(period: BudgetPeriod, startIso: string): string {
  const start = toDate(startIso)
  switch (period) {
    case 'weekly':
      return toIso(addDays(start, 7))
    case 'fortnightly':
      return toIso(addDays(start, 14))
    case 'monthly':
      return toIso(addMonths(start, 1))
    case 'annual':
      return toIso(addYears(start, 1))
  }
}

/**
 * The completed period windows from the budget's start up to (but not
 * including) the current period — the windows whose under/overspend rolls
 * forward when rollover is enabled.
 */
export function priorPeriods(
  period: BudgetPeriod,
  anchorIso: string,
  refIso: string,
): PeriodBounds[] {
  const current = periodBounds(period, refIso, anchorIso)
  const first = periodBounds(period, anchorIso, anchorIso)
  const out: PeriodBounds[] = []
  let startIso = first.start
  // Guard against runaway loops; a personal budget won't exceed this many cells.
  for (let i = 0; i < 1000 && startIso < current.start; i++) {
    const bounds = periodBounds(period, startIso, anchorIso)
    out.push(bounds)
    startIso = nextPeriodStart(period, startIso)
  }
  return out
}
