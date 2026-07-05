import { useQuery } from '@tanstack/react-query'
import { useHouseholdId } from '@/features/household/HouseholdContext'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

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

/** Category lookup helpers derived from the loaded list. */
export function useCategoryMap() {
  const { data: categories } = useCategories()
  const byId = new Map((categories ?? []).map((c) => [c.id, c]))
  return { categories: categories ?? [], byId }
}
