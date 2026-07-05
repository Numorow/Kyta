import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useHouseholdId } from '@/features/household/HouseholdContext'
import { supabase } from '@/lib/supabase'
import { periodBounds, priorPeriods, type BudgetPeriod } from '@/lib/period'
import { todayIso } from '@/lib/money'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type Budget = Tables<'budgets'>

export type BudgetProgress = {
  budget: Budget
  windowStart: string
  windowEnd: string
  spend: number // current period, from Postgres
  carry: number // accumulated under/overspend from prior periods (rollover only)
  effectiveBudget: number // amount + carry
  remaining: number // effectiveBudget - spend (negative = over)
}

function windowKey(start: string, end: string) {
  return `${start}|${end}`
}

export function budgetsKey(householdId: string) {
  return ['budgets', householdId]
}

/**
 * Budgets with current-period actual-vs-budget. All spend figures come from the
 * budget_actuals Postgres function (single source of truth); rollover carry is
 * the summed under/overspend across completed prior periods.
 */
export function useBudgetProgress(refIso: string = todayIso()) {
  const householdId = useHouseholdId()

  return useQuery({
    queryKey: [...budgetsKey(householdId), 'progress', refIso],
    queryFn: async (): Promise<BudgetProgress[]> => {
      const { data: budgets, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('is_active', true)
      if (error) throw error
      if (budgets.length === 0) return []

      // Collect every date window we need spend for: each budget's current
      // window, plus prior windows for rollover budgets. Dedupe so a shared
      // window (e.g. this calendar month) is queried once.
      const windows = new Map<string, { start: string; end: string }>()
      const budgetWindows = budgets.map((b) => {
        const period = b.period as BudgetPeriod
        const current = periodBounds(period, refIso, b.start_date)
        windows.set(windowKey(current.start, current.end), current)
        const priors = b.rollover ? priorPeriods(period, b.start_date, refIso) : []
        for (const p of priors) windows.set(windowKey(p.start, p.end), p)
        return { budget: b, current, priors }
      })

      // One budget_actuals call per unique window, in parallel.
      const windowList = [...windows.values()]
      const spendByWindow = new Map<string, Map<string, number>>()
      await Promise.all(
        windowList.map(async (w) => {
          const { data, error: fnError } = await supabase.rpc('budget_actuals', {
            p_household: householdId,
            p_from: w.start,
            p_to: w.end,
          })
          if (fnError) throw fnError
          spendByWindow.set(
            windowKey(w.start, w.end),
            new Map(data.map((r) => [r.category_id, Number(r.spend)])),
          )
        }),
      )

      const lookup = (start: string, end: string, categoryId: string) =>
        spendByWindow.get(windowKey(start, end))?.get(categoryId) ?? 0

      return budgetWindows.map(({ budget, current, priors }): BudgetProgress => {
        const spend = lookup(current.start, current.end, budget.category_id)
        const carry = budget.rollover
          ? priors.reduce(
              (sum, p) => sum + (budget.amount - lookup(p.start, p.end, budget.category_id)),
              0,
            )
          : 0
        const effectiveBudget = budget.amount + carry
        return {
          budget,
          windowStart: current.start,
          windowEnd: current.end,
          spend,
          carry,
          effectiveBudget,
          remaining: effectiveBudget - spend,
        }
      })
    },
  })
}

export function useUpsertBudget() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<'budgets'>, 'household_id'>) => {
      const { data, error } = await supabase
        .from('budgets')
        .upsert(
          { ...input, household_id: householdId },
          { onConflict: 'household_id,category_id,period' },
        )
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetsKey(householdId) }),
  })
}

export function useUpdateBudget() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<'budgets'> }) => {
      const { error } = await supabase.from('budgets').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetsKey(householdId) }),
  })
}

export function useDeleteBudget() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budgets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetsKey(householdId) }),
  })
}
