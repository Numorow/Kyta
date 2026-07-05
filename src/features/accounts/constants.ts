// Account taxonomy (brief §6). Subtypes are grouped by class so the account
// form can offer only the sensible options and default the class correctly.

export type AccountClass = 'asset' | 'liability'
export type AccountSubtype =
  | 'transaction'
  | 'savings'
  | 'credit_card'
  | 'mortgage'
  | 'personal_loan'
  | 'superannuation'
  | 'investment'
  | 'property'
  | 'vehicle'
  | 'cash'
  | 'other'
export type BalanceMode = 'tracked' | 'statement'

export const SUBTYPE_LABELS: Record<AccountSubtype, string> = {
  transaction: 'Everyday / Transaction',
  savings: 'Savings',
  credit_card: 'Credit Card',
  mortgage: 'Mortgage',
  personal_loan: 'Personal Loan',
  superannuation: 'Superannuation',
  investment: 'Investment',
  property: 'Property',
  vehicle: 'Vehicle',
  cash: 'Cash',
  other: 'Other',
}

// Which subtypes belong to which class, and the natural default balance mode.
// Statement-mode by default for accounts you typically don't line-item
// (super, property, a mortgage you track by statement) — brief §8.3.
export const SUBTYPES_BY_CLASS: Record<
  AccountClass,
  { value: AccountSubtype; defaultMode: BalanceMode }[]
> = {
  asset: [
    { value: 'transaction', defaultMode: 'tracked' },
    { value: 'savings', defaultMode: 'tracked' },
    { value: 'cash', defaultMode: 'tracked' },
    { value: 'superannuation', defaultMode: 'statement' },
    { value: 'investment', defaultMode: 'statement' },
    { value: 'property', defaultMode: 'statement' },
    { value: 'vehicle', defaultMode: 'statement' },
    { value: 'other', defaultMode: 'tracked' },
  ],
  liability: [
    { value: 'credit_card', defaultMode: 'tracked' },
    { value: 'mortgage', defaultMode: 'statement' },
    { value: 'personal_loan', defaultMode: 'statement' },
    { value: 'other', defaultMode: 'tracked' },
  ],
}

export function defaultModeForSubtype(subtype: AccountSubtype): BalanceMode {
  for (const list of Object.values(SUBTYPES_BY_CLASS)) {
    const match = list.find((s) => s.value === subtype)
    if (match) return match.defaultMode
  }
  return 'tracked'
}
