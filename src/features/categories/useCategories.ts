import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useHouseholdId } from '@/features/household/HouseholdContext'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type Category = Tables<'categories'>
export type CategoryKind = 'income' | 'expense' | 'transfer'

export function categoriesKey(householdId: string) {
  return ['categories', householdId]
}

export function useCategories() {
  const householdId = useHouseholdId()

  return useQuery({
    queryKey: categoriesKey(householdId),
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('archived', false)
        .order('kind')
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreateCategory() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<'categories'>, 'household_id'>) => {
      const { data, error } = await supabase
        .from('categories')
        .insert({ ...input, household_id: householdId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesKey(householdId) }),
  })
}

export function useUpdateCategory() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<'categories'> }) => {
      const { error } = await supabase.from('categories').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesKey(householdId) }),
  })
}

export function useArchiveCategory() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Archive, not delete — keeps historical transactions' category intact.
      const { error } = await supabase.from('categories').update({ archived: true }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesKey(householdId) }),
  })
}

/** Category lookup helpers derived from the loaded list. */
export function useCategoryMap() {
  const { data: categories } = useCategories()
  const byId = new Map((categories ?? []).map((c) => [c.id, c]))
  return { categories: categories ?? [], byId }
}
