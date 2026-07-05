import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useHouseholdId } from '@/features/household/HouseholdContext'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type Account = Tables<'accounts'>
export type AccountWithBalance = Account & { balance: number }

export function accountsKey(householdId: string) {
  return ['accounts', householdId]
}

export function useAccounts() {
  const householdId = useHouseholdId()

  return useQuery({
    queryKey: accountsKey(householdId),
    queryFn: async (): Promise<AccountWithBalance[]> => {
      // Accounts carry the metadata; account_balances (a view) carries the
      // computed current balance. Fetch both and merge by id so the balance
      // is always the reconciled figure from Postgres, never recomputed here.
      const [accountsRes, balancesRes] = await Promise.all([
        supabase
          .from('accounts')
          .select('*')
          .eq('archived', false)
          .order('class')
          .order('sort_order')
          .order('name'),
        supabase.from('account_balances').select('account_id, balance'),
      ])
      if (accountsRes.error) throw accountsRes.error
      if (balancesRes.error) throw balancesRes.error

      const balanceByAccount = new Map(
        balancesRes.data.map((b) => [b.account_id, b.balance ?? 0]),
      )
      return accountsRes.data.map((a) => ({
        ...a,
        balance: balanceByAccount.get(a.id) ?? 0,
      }))
    },
  })
}

export function useCreateAccount() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<'accounts'>, 'household_id'>) => {
      const { data, error } = await supabase
        .from('accounts')
        .insert({ ...input, household_id: householdId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountsKey(householdId) }),
  })
}

export function useUpdateAccount() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<'accounts'> }) => {
      const { data, error } = await supabase
        .from('accounts')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsKey(householdId) })
      queryClient.invalidateQueries({ queryKey: ['net-worth', householdId] })
    },
  })
}

export function useArchiveAccount() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Archive, never delete — preserves transaction history (brief §8.3).
      const { error } = await supabase.from('accounts').update({ archived: true }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountsKey(householdId) }),
  })
}
