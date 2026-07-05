import Papa from 'papaparse'
import { format, parse as parseDate, isValid } from 'date-fns'

// CSV parsing + column mapping for bank exports (brief §8.2). Handles the two
// shapes common to AU banks: a single signed Amount column, or separate
// Debit/Credit columns.

export type AmountMode = 'single' | 'debit_credit'

export type ImportMapping = {
  hasHeader: boolean
  dateCol: number
  descCol: number
  amountMode: AmountMode
  amountCol: number
  debitCol: number
  creditCol: number
  dateFormat: string
  // Some banks list debits as positive in a single Amount column; invert to
  // fit our signed convention (expense = negative).
  invertSingle: boolean
}

// Formats we attempt for the date column, AU-first.
export const DATE_FORMATS = [
  'dd/MM/yyyy',
  'd/MM/yyyy',
  'dd/MM/yy',
  'yyyy-MM-dd',
  'dd-MM-yyyy',
  'dd MMM yyyy',
  'MM/dd/yyyy',
] as const

export function parseCsv(text: string): string[][] {
  const result = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true })
  return result.data
}

/** Strip currency symbols/commas/parentheses and parse to a number. */
export function parseAmount(raw: string): number | null {
  if (raw == null) return null
  let s = String(raw).trim()
  if (s === '') return null
  let negative = false
  // (123.45) accounting notation → negative
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }
  if (/-\s*$/.test(s) || /^\s*-/.test(s)) negative = true
  const cleaned = s.replace(/[^0-9.]/g, '')
  if (cleaned === '') return null
  const n = Number(cleaned)
  if (Number.isNaN(n)) return null
  return negative ? -Math.abs(n) : n
}

/** Try each candidate format; return a date-only ISO string or null. */
export function parseImportDate(raw: string, preferredFormat?: string): string | null {
  if (!raw) return null
  const value = raw.trim()
  const formats = preferredFormat
    ? [preferredFormat, ...DATE_FORMATS.filter((f) => f !== preferredFormat)]
    : DATE_FORMATS
  for (const fmt of formats) {
    const d = parseDate(value, fmt, new Date())
    if (isValid(d)) return format(d, 'yyyy-MM-dd')
  }
  return null
}

const DATE_HEADERS = ['date', 'transaction date', 'posted', 'processed']
const DESC_HEADERS = ['description', 'narrative', 'details', 'transaction', 'reference', 'memo']
const AMOUNT_HEADERS = ['amount', 'value']
const DEBIT_HEADERS = ['debit', 'withdrawal', 'money out', 'paid out']
const CREDIT_HEADERS = ['credit', 'deposit', 'money in', 'paid in']

function findHeader(headers: string[], candidates: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().trim())
  for (const c of candidates) {
    const idx = lower.findIndex((h) => h.includes(c))
    if (idx !== -1) return idx
  }
  return -1
}

/** Best-effort auto-detection of a mapping from the first (header) row. */
export function detectMapping(rows: string[][]): ImportMapping {
  const header = rows[0] ?? []
  // Treat row 0 as a header if it has no parseable date in the date-ish column.
  const dateCol = Math.max(findHeader(header, DATE_HEADERS), 0)
  const debitCol = findHeader(header, DEBIT_HEADERS)
  const creditCol = findHeader(header, CREDIT_HEADERS)
  const amountCol = findHeader(header, AMOUNT_HEADERS)
  const descCol = Math.max(findHeader(header, DESC_HEADERS), 1)

  const looksLikeHeader = header.some((cell) =>
    [...DATE_HEADERS, ...DESC_HEADERS, ...AMOUNT_HEADERS, ...DEBIT_HEADERS, ...CREDIT_HEADERS].some(
      (h) => cell.toLowerCase().includes(h),
    ),
  )

  const useDebitCredit = debitCol !== -1 && creditCol !== -1

  return {
    hasHeader: looksLikeHeader,
    dateCol,
    descCol,
    amountMode: useDebitCredit ? 'debit_credit' : 'single',
    amountCol: amountCol === -1 ? 2 : amountCol,
    debitCol: debitCol === -1 ? 2 : debitCol,
    creditCol: creditCol === -1 ? 3 : creditCol,
    dateFormat: 'dd/MM/yyyy',
    invertSingle: false,
  }
}

export type ParsedRow = {
  txn_date: string | null
  amount: number | null
  description: string
  valid: boolean
  raw: string[]
}

/** Apply a mapping to the data rows, producing signed, dated transactions. */
export function applyMapping(rows: string[][], mapping: ImportMapping): ParsedRow[] {
  const dataRows = mapping.hasHeader ? rows.slice(1) : rows
  return dataRows.map((raw) => {
    const txn_date = parseImportDate(raw[mapping.dateCol] ?? '', mapping.dateFormat)
    const description = (raw[mapping.descCol] ?? '').trim()

    let amount: number | null
    if (mapping.amountMode === 'debit_credit') {
      const debit = parseAmount(raw[mapping.debitCol] ?? '')
      const credit = parseAmount(raw[mapping.creditCol] ?? '')
      // Debit = money out (negative), credit = money in (positive).
      if (debit != null && Math.abs(debit) > 0) amount = -Math.abs(debit)
      else if (credit != null && Math.abs(credit) > 0) amount = Math.abs(credit)
      else amount = null
    } else {
      const single = parseAmount(raw[mapping.amountCol] ?? '')
      amount = single == null ? null : mapping.invertSingle ? -single : single
    }

    const valid = txn_date != null && amount != null && amount !== 0
    return { txn_date, amount, description, valid, raw }
  })
}
