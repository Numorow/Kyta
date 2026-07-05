import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { useHouseholdId } from '@/features/household/HouseholdContext'
import { accountsKey } from '@/features/accounts/useAccounts'
import { supabase } from '@/lib/supabase'
import { todayIso } from '@/lib/money'
import type { Tables } from '@/types/database'

export type Payslip = Tables<'payslips'>

/** AU financial year runs 1 Jul – 30 Jun; return the current FY's start date. */
export function financialYearStart(iso: string = todayIso()): string {
  const [y, m] = iso.split('-').map(Number)
  const fyYear = m >= 7 ? y : y - 1
  return `${fyYear}-07-01`
}

export function payslipsKey(householdId: string) {
  return ['payslips', householdId]
}

export function usePayslips() {
  const householdId = useHouseholdId()
  return useQuery({
    queryKey: payslipsKey(householdId),
    queryFn: async (): Promise<Payslip[]> => {
      const { data, error } = await supabase
        .from('payslips')
        .select('*')
        .order('pay_date', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export type YtdTotals = {
  gross: number
  tax: number
  super: number
  net: number
  fyStart: string
}

/** Financial-year-to-date gross / PAYG / super / net across all payslips. */
export function useYtdTotals() {
  const { data: payslips } = usePayslips()
  const fyStart = financialYearStart()
  const inFy = (payslips ?? []).filter((p) => p.pay_date >= fyStart)
  const totals: YtdTotals = {
    gross: inFy.reduce((s, p) => s + Number(p.gross), 0),
    tax: inFy.reduce((s, p) => s + Number(p.tax), 0),
    super: inFy.reduce((s, p) => s + Number(p.super), 0),
    net: inFy.reduce((s, p) => s + Number(p.net), 0),
    fyStart,
  }
  return totals
}

export type NewPayslip = {
  member_label: string | null
  employer: string | null
  pay_date: string
  gross: number
  tax: number
  deductions: number
  super: number
  net: number
  deposit_account_id: string | null
  super_account_id: string | null
  superIsTracked: boolean // whether to accrue super as a real transaction
}

export function useCreatePayslip() {
  const householdId = useHouseholdId()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: NewPayslip) => {
      // 1) Net pay hits the bank as an income transaction.
      let incomeTxnId: string | null = null
      if (input.deposit_account_id && input.net > 0) {
        const wages = await supabase
          .from('categories')
          .select('id')
          .eq('household_id', householdId)
          .eq('name', 'Wages/Salary')
          .maybeSingle()
        const { data: txn, error } = await supabase
          .from('transactions')
          .insert({
            household_id: householdId,
            account_id: input.deposit_account_id,
            txn_date: input.pay_date,
            amount: input.net,
            type: 'income',
            category_id: wages.data?.id ?? null,
            description: input.employer ? `Pay — ${input.employer}` : 'Pay',
            created_by: user?.id ?? null,
          })
          .select('id')
          .single()
        if (error) throw error
        incomeTxnId = txn.id
      }

      // 2) Super guarantee accrues to the super account, but only if that
      // account is tracked (a statement super account is updated from fund
      // statements — the contribution is still captured on the payslip for
      // YTD reporting).
      let superTxnId: string | null = null
      if (input.super_account_id && input.super > 0 && input.superIsTracked) {
        const superCat = await supabase
          .from('categories')
          .select('id')
          .eq('household_id', householdId)
          .eq('name', 'Super Contributions')
          .maybeSingle()
        const { data: txn, error } = await supabase
          .from('transactions')
          .insert({
            household_id: householdId,
            account_id: input.super_account_id,
            txn_date: input.pay_date,
            amount: input.super,
            type: 'income',
            category_id: superCat.data?.id ?? null,
            description: input.employer ? `Super — ${input.employer}` : 'Super guarantee',
            created_by: user?.id ?? null,
          })
          .select('id')
          .single()
        if (error) throw error
        superTxnId = txn.id
      }

      // 3) The payslip record itself, linking the transactions it generated.
      const { error: slipError } = await supabase.from('payslips').insert({
        household_id: householdId,
        member_label: input.member_label,
        employer: input.employer,
        pay_date: input.pay_date,
        gross: input.gross,
        tax: input.tax,
        deductions: input.deductions,
        super: input.super,
        net: input.net,
        deposit_account_id: input.deposit_account_id,
        super_account_id: input.super_account_id,
        income_transaction_id: incomeTxnId,
        super_transaction_id: superTxnId,
        created_by: user?.id ?? null,
      })
      if (slipError) throw slipError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payslipsKey(householdId) })
      queryClient.invalidateQueries({ queryKey: ['transactions', householdId] })
      queryClient.invalidateQueries({ queryKey: accountsKey(householdId) })
      queryClient.invalidateQueries({ queryKey: ['net-worth', householdId] })
    },
  })
}

export function useDeletePayslip() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (slip: Payslip) => {
      // Reverse the transactions this payslip created, then remove it.
      const txnIds = [slip.income_transaction_id, slip.super_transaction_id].filter(
        Boolean,
      ) as string[]
      if (txnIds.length > 0) {
        const { error } = await supabase.from('transactions').delete().in('id', txnIds)
        if (error) throw error
      }
      const { error } = await supabase.from('payslips').delete().eq('id', slip.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payslipsKey(householdId) })
      queryClient.invalidateQueries({ queryKey: ['transactions', householdId] })
      queryClient.invalidateQueries({ queryKey: accountsKey(householdId) })
      queryClient.invalidateQueries({ queryKey: ['net-worth', householdId] })
    },
  })
}
