import { describe, it, expect } from 'vitest'
import { applyMapping, detectMapping, parseAmount, parseImportDate, type ImportMapping } from './csv'

describe('parseAmount', () => {
  it('parses plain and signed numbers', () => {
    expect(parseAmount('42.50')).toBe(42.5)
    expect(parseAmount('-42.50')).toBe(-42.5)
    expect(parseAmount('1,234.56')).toBe(1234.56)
  })
  it('strips currency symbols', () => {
    expect(parseAmount('$1,234.56')).toBe(1234.56)
    expect(parseAmount('-$99.00')).toBe(-99)
  })
  it('treats parentheses as negative', () => {
    expect(parseAmount('(50.00)')).toBe(-50)
  })
  it('returns null for blanks', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('  ')).toBeNull()
  })
})

describe('parseImportDate', () => {
  it('parses AU day-first dates by default', () => {
    expect(parseImportDate('05/07/2026')).toBe('2026-07-05')
    expect(parseImportDate('5/7/2026')).toBe('2026-07-05')
  })
  it('parses ISO dates', () => {
    expect(parseImportDate('2026-07-05')).toBe('2026-07-05')
  })
  it('respects a preferred format for ambiguous dates', () => {
    // 03/04/2026 is 3 April (AU) by default, but 4 March if US format preferred.
    expect(parseImportDate('03/04/2026', 'dd/MM/yyyy')).toBe('2026-04-03')
    expect(parseImportDate('03/04/2026', 'MM/dd/yyyy')).toBe('2026-03-04')
  })
  it('returns null for junk', () => {
    expect(parseImportDate('not a date')).toBeNull()
  })
})

describe('detectMapping', () => {
  it('detects a single-amount-column header', () => {
    const rows = [
      ['Date', 'Description', 'Amount'],
      ['05/07/2026', 'Woolworths', '-42.50'],
    ]
    const m = detectMapping(rows)
    expect(m.hasHeader).toBe(true)
    expect(m.amountMode).toBe('single')
    expect(m.dateCol).toBe(0)
    expect(m.descCol).toBe(1)
    expect(m.amountCol).toBe(2)
  })
  it('detects separate debit/credit columns', () => {
    const rows = [
      ['Date', 'Narrative', 'Debit', 'Credit'],
      ['05/07/2026', 'Salary', '', '3200.00'],
    ]
    const m = detectMapping(rows)
    expect(m.amountMode).toBe('debit_credit')
    expect(m.debitCol).toBe(2)
    expect(m.creditCol).toBe(3)
  })
})

describe('applyMapping', () => {
  const baseMapping: ImportMapping = {
    hasHeader: true,
    dateCol: 0,
    descCol: 1,
    amountMode: 'single',
    amountCol: 2,
    debitCol: 2,
    creditCol: 3,
    dateFormat: 'dd/MM/yyyy',
    invertSingle: false,
  }

  it('maps a single signed amount column', () => {
    const rows = [
      ['Date', 'Description', 'Amount'],
      ['05/07/2026', 'Woolworths', '-42.50'],
      ['04/07/2026', 'Salary', '3200.00'],
    ]
    const parsed = applyMapping(rows, baseMapping)
    expect(parsed).toHaveLength(2)
    expect(parsed[0]).toMatchObject({ txn_date: '2026-07-05', amount: -42.5, description: 'Woolworths', valid: true })
    expect(parsed[1]).toMatchObject({ txn_date: '2026-07-04', amount: 3200, valid: true })
  })

  it('maps debit/credit columns to signed amounts', () => {
    const rows = [
      ['Date', 'Narrative', 'Debit', 'Credit'],
      ['05/07/2026', 'Groceries', '42.50', ''],
      ['04/07/2026', 'Salary', '', '3200.00'],
    ]
    const parsed = applyMapping(rows, { ...baseMapping, amountMode: 'debit_credit' })
    expect(parsed[0]).toMatchObject({ amount: -42.5 }) // debit = out
    expect(parsed[1]).toMatchObject({ amount: 3200 }) // credit = in
  })

  it('flags rows with unparseable dates or zero amounts as invalid', () => {
    const rows = [
      ['Date', 'Description', 'Amount'],
      ['garbage', 'Bad row', '10.00'],
      ['05/07/2026', 'Zero', '0'],
    ]
    const parsed = applyMapping(rows, baseMapping)
    expect(parsed[0].valid).toBe(false)
    expect(parsed[1].valid).toBe(false)
  })

  it('inverts the single column when the bank lists debits as positive', () => {
    const rows = [
      ['Date', 'Description', 'Amount'],
      ['05/07/2026', 'Woolworths', '42.50'],
    ]
    const parsed = applyMapping(rows, { ...baseMapping, invertSingle: true })
    expect(parsed[0].amount).toBe(-42.5)
  })
})
