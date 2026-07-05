import { addDays, addMonths, addYears, format, getDaysInMonth } from 'date-fns'

// Recurrence expansion (brief §9). Everything is date-only (yyyy-MM-dd strings)
// computed from local-midnight Dates, so there is no timezone or DST drift —
// an occurrence "on the 15th" is the 15th regardless of clock or offset.

export type RecurrenceFrequency =
  | 'weekly'
  | 'fortnightly'
  | 'monthly'
  | 'quarterly'
  | 'annually'
  | 'custom'

export type RecurrenceRule = {
  frequency: RecurrenceFrequency
  interval_count: number
  anchor_date: string // yyyy-MM-dd — first occurrence
  day_of_month: number | null // optional override for monthly/quarterly
  end_date: string | null // inclusive
}

export type Occurrence = { date: string }

function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function toIso(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

// Build the nth month-based occurrence, clamping the target day to the month's
// length (e.g. a "31st" rule lands on the 28th/30th in shorter months).
function monthlyOccurrence(anchor: Date, targetDay: number, monthsToAdd: number): Date {
  const base = addMonths(new Date(anchor.getFullYear(), anchor.getMonth(), 1), monthsToAdd)
  const day = Math.min(targetDay, getDaysInMonth(base))
  return new Date(base.getFullYear(), base.getMonth(), day)
}

/**
 * Expand a rule into concrete dated occurrences within [from, to] (both
 * inclusive, yyyy-MM-dd). Never emits before anchor_date; stops at end_date
 * (inclusive) and at `to`.
 */
export function expandOccurrences(
  rule: RecurrenceRule,
  fromIso: string,
  toIso_: string,
): Occurrence[] {
  const interval = Math.max(1, rule.interval_count || 1)
  const anchor = toDate(rule.anchor_date)
  const from = toDate(fromIso)
  const to = toDate(toIso_)
  const end = rule.end_date ? toDate(rule.end_date) : null

  const out: Occurrence[] = []
  const SAFETY = 5000 // bound the loop; a decade of weekly is ~520

  const emit = (d: Date): 'continue' | 'stop' => {
    if (d > to) return 'stop'
    if (end && d > end) return 'stop'
    if (d >= anchor && d >= from) out.push({ date: toIso(d) })
    return 'continue'
  }

  switch (rule.frequency) {
    case 'weekly':
    case 'fortnightly':
    case 'custom': {
      // Dedicated day-step cases. Fortnightly is anchor + 14·n (NOT "2 weeks of
      // a month"); custom means every interval_count days.
      const stepDays =
        rule.frequency === 'weekly'
          ? 7 * interval
          : rule.frequency === 'fortnightly'
            ? 14 * interval
            : interval // custom
      for (let n = 0; n < SAFETY; n++) {
        const d = addDays(anchor, n * stepDays)
        if (emit(d) === 'stop') break
      }
      break
    }
    case 'monthly':
    case 'quarterly': {
      const monthsStep = (rule.frequency === 'quarterly' ? 3 : 1) * interval
      const targetDay = rule.day_of_month ?? anchor.getDate()
      for (let n = 0; n < SAFETY; n++) {
        const d = monthlyOccurrence(anchor, targetDay, n * monthsStep)
        if (emit(d) === 'stop') break
      }
      break
    }
    case 'annually': {
      for (let n = 0; n < SAFETY; n++) {
        const d = addYears(anchor, n * interval)
        if (emit(d) === 'stop') break
      }
      break
    }
  }

  return out
}

/** The first occurrence strictly after `afterIso` (used to advance next_due_date). */
export function nextOccurrenceAfter(rule: RecurrenceRule, afterIso: string): string | null {
  // Look a decade ahead; enough for any real bill cadence.
  const to = toIso(addYears(toDate(afterIso), 10))
  const upcoming = expandOccurrences(rule, afterIso, to).filter((o) => o.date > afterIso)
  return upcoming[0]?.date ?? null
}
