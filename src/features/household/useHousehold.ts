import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type MyHousehold = {
  membership: Pick<Tables<'household_members'>, 'household_id' | 'role'>
  household: Tables<'households'>
}

const QUERY_KEY = ['my-household']

export function useMyHousehold() {
  const { user } = useAuth()

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MyHousehold | null> => {
      const { data, error } = await supabase
        .from('household_members')
        .select('household_id, role, households(*)')
        .eq('user_id', user!.id)
        .limit(1)
        .maybeSingle()

      if (error) throw error
      if (!data || !data.households) return null

      return {
        membership: { household_id: data.household_id, role: data.role },
        household: data.households,
      }
    },
  })
}

export function useInvalidateMyHousehold() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })
}
