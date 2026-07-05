import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useHouseholdId } from '@/features/household/HouseholdContext'
import { supabase } from '@/lib/supabase'

/**
 * Subscribe to household changes so one partner's edits refresh the other's
 * screen live (brief §8.1). A change to transactions/accounts/budgets can move
 * balances, net worth, budgets, and the bills timeline, so we invalidate the
 * affected query families and let TanStack Query refetch what's on screen.
 */
export function useRealtimeSync() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()

  useEffect(() => {
    const invalidateAll = () => {
      for (const key of [
        ['transactions', householdId],
        ['accounts', householdId],
        ['net-worth', householdId],
        ['net-worth-history', householdId],
        ['budgets', householdId],
        ['recurring', householdId],
      ]) {
        queryClient.invalidateQueries({ queryKey: key })
      }
    }

    const filter = `household_id=eq.${householdId}`
    const channel = supabase
      .channel(`household-${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts', filter }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets', filter }, invalidateAll)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [householdId, queryClient])
}
