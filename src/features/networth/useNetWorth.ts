import { useQuery } from '@tanstack/react-query'
import { useHouseholdId } from '@/features/household/HouseholdContext'
import { supabase } from '@/lib/supabase'

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
      // No accounts yet → the view returns no row for the household.
      return {
        total_assets: data?.total_assets ?? 0,
        total_liabilities: data?.total_liabilities ?? 0,
        net_worth: data?.net_worth ?? 0,
      }
    },
  })
}
