import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useHouseholdId } from '@/features/household/HouseholdContext'
import { supabase } from '@/lib/supabase'
import { todayIso } from '@/lib/money'
import { useAccounts, type AccountWithBalance } from '@/features/accounts/useAccounts'
import type { AccountSubtype } from '@/features/accounts/constants'
import type { Tables } from '@/types/database'

export type NetWorth = {
  total_assets: number
  total_liabilities: number
  net_worth: number
}

export function useNetWorth() {
  const householdId = useHouseholdId()

  return useQuery({
    queryKey: ['net-worth', householdId],
    queryFn: async (): Promise<NetWorth> => {
      const { data, error } = await supabase
        .from('net_worth_current')
        .select('total_assets, total_liabilities, net_worth')
        .maybeSingle()
      if (error) throw error
      return {
        total_assets: data?.total_assets ?? 0,
        total_liabilities: data?.total_liabilities ?? 0,
        net_worth: data?.net_worth ?? 0,
      }
    },
  })
}

export type Snapshot = Tables<'balance_snapshots'>

export function snapshotsKey(householdId: string) {
  return ['net-worth-history', householdId]
}

export function useNetWorthHistory() {
  const householdId = useHouseholdId()
  return useQuery({
    queryKey: snapshotsKey(householdId),
    queryFn: async (): Promise<Snapshot[]> => {
      const { data, error } = await supabase
        .from('balance_snapshots')
        .select('*')
        .order('snapshot_date')
      if (error) throw error
      return data
    },
  })
}

export function useTakeSnapshot() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Capture the current computed figures + per-account detail. Stored as
      // values (not recomputed later), so the snapshot is an immutable point.
      const [nwRes, balRes] = await Promise.all([
        supabase
          .from('net_worth_current')
          .select('total_assets, total_liabilities, net_worth')
          .maybeSingle(),
        supabase.from('account_balances').select('account_id, class, balance'),
      ])
      if (nwRes.error) throw nwRes.error
      if (balRes.error) throw balRes.error

      const { error } = await supabase.from('balance_snapshots').upsert(
        {
          household_id: householdId,
          snapshot_date: todayIso(),
          total_assets: nwRes.data?.total_assets ?? 0,
          total_liabilities: nwRes.data?.total_liabilities ?? 0,
          net_worth: nwRes.data?.net_worth ?? 0,
          breakdown: balRes.data,
        },
        { onConflict: 'household_id,snapshot_date' },
      )
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: snapshotsKey(householdId) }),
  })
}

// Coarse allocation buckets from account subtype (brief §8.6).
const ALLOCATION_BUCKET: Record<AccountSubtype, string> = {
  transaction: 'Cash & savings',
  savings: 'Cash & savings',
  cash: 'Cash & savings',
  superannuation: 'Superannuation',
  investment: 'Investments',
  property: 'Property',
  vehicle: 'Vehicles',
  personal_loan: 'Other',
  credit_card: 'Other',
  mortgage: 'Other',
  other: 'Other',
}

export type AllocationSlice = { bucket: string; value: number }

/** Asset allocation across cash/super/property/investments/vehicles. */
export function useAssetAllocation() {
  const { data: accounts, isLoading } = useAccounts()

  const assets = (accounts ?? []).filter(
    (a: AccountWithBalance) => a.class === 'asset' && a.include_in_net_worth,
  )
  const byBucket = new Map<string, number>()
  for (const a of assets) {
    const bucket = ALLOCATION_BUCKET[a.subtype as AccountSubtype] ?? 'Other'
    byBucket.set(bucket, (byBucket.get(bucket) ?? 0) + a.balance)
  }
  const allocation: AllocationSlice[] = [...byBucket.entries()]
    .map(([bucket, value]) => ({ bucket, value }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)

  return { allocation, isLoading }
}
