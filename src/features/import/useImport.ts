import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { useHouseholdId } from '@/features/household/HouseholdContext'
import { accountsKey } from '@/features/accounts/useAccounts'
import { supabase } from '@/lib/supabase'
import type { ImportMapping } from '@/lib/csv'
import type { ParsedRow } from '@/lib/csv'

export function useImportMapping(accountId: string | undefined) {
  const householdId = useHouseholdId()
  return useQuery({
    queryKey: ['import-mapping', householdId, accountId],
    enabled: !!accountId,
    queryFn: async (): Promise<ImportMapping | null> => {
      const { data, error } = await supabase
        .from('import_mappings')
        .select('mapping')
        .eq('account_id', accountId!)
        .maybeSingle()
      if (error) throw error
      return (data?.mapping as ImportMapping) ?? null
    },
  })
}

export function useSaveImportMapping() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ accountId, mapping }: { accountId: string; mapping: ImportMapping }) => {
      const { error } = await supabase
        .from('import_mappings')
        .upsert(
          { household_id: householdId, account_id: accountId, mapping, updated_at: new Date().toISOString() },
          { onConflict: 'household_id,account_id' },
        )
      if (error) throw error
    },
    onSuccess: (_data, { accountId }) =>
      queryClient.invalidateQueries({ queryKey: ['import-mapping', householdId, accountId] }),
  })
}

export type DedupeRow = ParsedRow & { isDuplicate: boolean }

/**
 * Flag parsed rows that already exist for the account (same date + amount +
 * description). We fetch existing transactions in the import's date window and
 * match client-side, so re-uploading overlapping rows is caught without a hard
 * unique constraint that would wrongly block legitimate same-day/same-amount
 * transactions (brief §8.2).
 */
export function useDedupe() {
  return useMutation({
    mutationFn: async ({
      accountId,
      rows,
    }: {
      accountId: string
      rows: ParsedRow[]
    }): Promise<DedupeRow[]> => {
      const valid = rows.filter((r) => r.valid)
      if (valid.length === 0) return rows.map((r) => ({ ...r, isDuplicate: false }))

      const dates = valid.map((r) => r.txn_date!).sort()
      const from = dates[0]
      const to = dates[dates.length - 1]

      const { data: existing, error } = await supabase
        .from('transactions')
        .select('txn_date, amount, description')
        .eq('account_id', accountId)
        .gte('txn_date', from)
        .lte('txn_date', to)
      if (error) throw error

      const key = (d: string, a: number, desc: string | null) =>
        `${d}|${a.toFixed(2)}|${(desc ?? '').trim().toLowerCase()}`
      const existingKeys = new Set(existing.map((e) => key(e.txn_date, e.amount, e.description)))

      return rows.map((r) => ({
        ...r,
        isDuplicate:
          r.valid && existingKeys.has(key(r.txn_date!, r.amount!, r.description)),
      }))
    },
  })
}

export function useCommitImport() {
  const householdId = useHouseholdId()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      accountId,
      filename,
      rows,
    }: {
      accountId: string
      filename: string
      rows: ParsedRow[]
    }) => {
      const toImport = rows.filter((r) => r.valid)
      if (toImport.length === 0) throw new Error('No rows selected to import')

      const { data: batch, error: batchError } = await supabase
        .from('import_batches')
        .insert({
          household_id: householdId,
          account_id: accountId,
          filename,
          row_count: toImport.length,
          created_by: user?.id ?? null,
        })
        .select('id')
        .single()
      if (batchError) throw batchError

      const inserts = toImport.map((r) => ({
        household_id: householdId,
        account_id: accountId,
        txn_date: r.txn_date!,
        amount: r.amount!,
        // Bank imports arrive uncategorised; type follows the sign.
        type: r.amount! >= 0 ? ('income' as const) : ('expense' as const),
        category_id: null,
        description: r.description || null,
        import_batch_id: batch.id,
        created_by: user?.id ?? null,
      }))

      const { error: insertError } = await supabase.from('transactions').insert(inserts)
      if (insertError) throw insertError
      return { count: inserts.length }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', householdId] })
      queryClient.invalidateQueries({ queryKey: accountsKey(householdId) })
      queryClient.invalidateQueries({ queryKey: ['net-worth', householdId] })
    },
  })
}
