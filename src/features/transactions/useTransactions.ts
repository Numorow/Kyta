import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { useHouseholdId } from '@/features/household/HouseholdContext'
import { accountsKey } from '@/features/accounts/useAccounts'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/types/database'

export type Transaction = Tables<'transactions'>
export type TransactionRow = Transaction & {
  accounts: { name: string } | null
  categories: { name: string; kind: string } | null
}

export type TransactionFilters = {
  accountId?: string
  categoryId?: string
  type?: 'income' | 'expense' | 'transfer'
  search?: string
  uncategorisedOnly?: boolean
  from?: string
  to?: string
}

export function transactionsKey(householdId: string, filters: TransactionFilters) {
  return ['transactions', householdId, filters]
}

// After any write that changes balances, both the account balances and the
// net-worth figure must refresh alongside the transaction list.
function useInvalidateAfterWrite() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['transactions', householdId] })
    queryClient.invalidateQueries({ queryKey: accountsKey(householdId) })
    queryClient.invalidateQueries({ queryKey: ['net-worth', householdId] })
  }
}

export function useTransactions(filters: TransactionFilters = {}) {
  const householdId = useHouseholdId()

  return useQuery({
    queryKey: transactionsKey(householdId, filters),
    queryFn: async (): Promise<TransactionRow[]> => {
      let query = supabase
        .from('transactions')
        .select('*, accounts(name), categories(name, kind)')
        .order('txn_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500)

      if (filters.accountId) query = query.eq('account_id', filters.accountId)
      if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
      if (filters.type) query = query.eq('type', filters.type)
      if (filters.uncategorisedOnly) query = query.is('category_id', null)
      if (filters.from) query = query.gte('txn_date', filters.from)
      if (filters.to) query = query.lte('txn_date', filters.to)
      if (filters.search) {
        const term = `%${filters.search}%`
        query = query.or(`description.ilike.${term},merchant.ilike.${term},notes.ilike.${term}`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as TransactionRow[]
    },
  })
}

export type NewTransaction = {
  account_id: string
  txn_date: string
  amount: number
  type: 'income' | 'expense'
  category_id: string | null
  description: string | null
  merchant?: string | null
}

export function useCreateTransaction() {
  const householdId = useHouseholdId()
  const { user } = useAuth()
  const invalidate = useInvalidateAfterWrite()

  return useMutation({
    mutationFn: async (input: NewTransaction) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...input, household_id: householdId, created_by: user?.id ?? null })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: invalidate,
  })
}

export function useUpdateTransaction() {
  const invalidate = useInvalidateAfterWrite()

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<'transactions'> }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: invalidate,
  })
}

export function useDeleteTransactions() {
  const invalidate = useInvalidateAfterWrite()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('transactions').delete().in('id', ids)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export type NewTransfer = {
  from_account_id: string
  to_account_id: string
  txn_date: string
  amount: number // positive magnitude
  description: string | null
}

export function useCreateTransfer() {
  const householdId = useHouseholdId()
  const { user } = useAuth()
  const invalidate = useInvalidateAfterWrite()

  return useMutation({
    mutationFn: async (input: NewTransfer) => {
      // Two legs sharing a transfer_group_id: negative on source, positive on
      // destination. Both type='transfer' so they net to zero and never appear
      // as income/expense in reports or net worth (brief §8.2, §10).
      const groupId = crypto.randomUUID()
      const magnitude = Math.abs(input.amount)
      const legs = [
        {
          household_id: householdId,
          account_id: input.from_account_id,
          txn_date: input.txn_date,
          amount: -magnitude,
          type: 'transfer' as const,
          category_id: null,
          description: input.description,
          transfer_group_id: groupId,
          created_by: user?.id ?? null,
        },
        {
          household_id: householdId,
          account_id: input.to_account_id,
          txn_date: input.txn_date,
          amount: magnitude,
          type: 'transfer' as const,
          category_id: null,
          description: input.description,
          transfer_group_id: groupId,
          created_by: user?.id ?? null,
        },
      ]
      const { error } = await supabase.from('transactions').insert(legs)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
