// AUD / en-AU money + date formatting and signed-amount helpers (brief §11).
// Signed convention on transactions: negative = money out, positive = money in.

const audFormatter = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
})

const audSignedFormatter = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  signDisplay: 'exceptZero',
})

/** `$1,234.56` — no explicit + sign. */
export function formatMoney(amount: number): string {
  return audFormatter.format(amount)
}

/** `+$1,234.56` / `-$1,234.56` — for signed transaction amounts. */
export function formatSignedMoney(amount: number): string {
  return audSignedFormatter.format(amount)
}

const dateFormatter = new Intl.DateTimeFormat('en-AU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** A date-only string (`YYYY-MM-DD`) → `DD/MM/YYYY`, parsed as local, no TZ shift. */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return dateFormatter.format(new Date(year, month - 1, day))
}

/** Today as a date-only `YYYY-MM-DD` string in local time (for form defaults). */
export function todayIso(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Tailwind text color for a signed amount: income green / expense red / muted zero.
 * Uses the semantic tokens defined in index.css (brief §11).
 */
export function amountColorClass(amount: number): string {
  if (amount > 0) return 'text-income'
  if (amount < 0) return 'text-expense'
  return 'text-muted-foreground'
}
