import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { useHouseholdId } from '@/features/household/HouseholdContext'
import { supabase } from '@/lib/supabase'
import { todayIso } from '@/lib/money'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type Goal = Tables<'goals'>
export type GoalContribution = Tables<'goal_contributions'>

export type GoalProgress = {
  goal: Goal
  saved: number // Σ contributions (signed), from the goal_progress RPC
  pct: number // saved / target (0..∞, not clamped)
  remaining: number // target − saved (negative once over-saved)
  linkedBalance: number | null // display-only "available in account" hint
  perMonthNeeded: number | null // to reach target by target_date (null if no date / already there)
}

export function goalsKey(householdId: string) {
  return ['goals', householdId]
}

// Rough fractional months between two date-only strings — used only for the
// "$X / month to reach it" hint, so approximate is fine.
function monthsUntil(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split('-').map(Number)
  const [ty, tm, td] = toIso.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm) + (td - fd) / 30
}

/**
 * Goals with progress. `saved` comes from the goal_progress Postgres function
 * (single source of truth, like budget_actuals); the linked account balance is
 * only a soft hint and never the progress figure.
 */
export function useGoalProgress() {
  const householdId = useHouseholdId()

  return useQuery({
    queryKey: [...goalsKey(householdId), 'progress'],
    queryFn: async (): Promise<GoalProgress[]> => {
      const [goalsRes, progressRes, balRes] = await Promise.all([
        supabase
          .from('goals')
          .select('*')
          .eq('is_active', true)
          .order('sort_order')
          .order('created_at'),
        supabase.rpc('goal_progress', { p_household: householdId }),
        supabase.from('account_balances').select('account_id, balance'),
      ])
      if (goalsRes.error) throw goalsRes.error
      if (progressRes.error) throw progressRes.error
      if (balRes.error) throw balRes.error

      // numeric(14,2) arrives from PostgREST as strings — coerce at the boundary.
      const savedByGoal = new Map(progressRes.data.map((r) => [r.goal_id, Number(r.saved)]))
      const balByAccount = new Map(balRes.data.map((b) => [b.account_id, Number(b.balance ?? 0)]))
      const today = todayIso()

      return goalsRes.data.map((goal): GoalProgress => {
        const target = Number(goal.target_amount)
        const saved = savedByGoal.get(goal.id) ?? 0
        const remaining = target - saved
        const pct = target > 0 ? saved / target : 0
        const linkedBalance = goal.linked_account_id
          ? (balByAccount.get(goal.linked_account_id) ?? 0)
          : null
        let perMonthNeeded: number | null = null
        if (goal.target_date && remaining > 0) {
          const months = monthsUntil(today, goal.target_date)
          perMonthNeeded = months > 0 ? remaining / months : remaining
        }
        return { goal, saved, pct, remaining, linkedBalance, perMonthNeeded }
      })
    },
  })
}

export function useCreateGoal() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<'goals'>, 'household_id'>) => {
      const { data, error } = await supabase
        .from('goals')
        .insert({ ...input, household_id: householdId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalsKey(householdId) }),
  })
}

export function useUpdateGoal() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<'goals'> }) => {
      const { error } = await supabase.from('goals').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalsKey(householdId) }),
  })
}

export function useArchiveGoal() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return useMutation({
    // Archive (not delete) — keeps a reached/abandoned goal's contribution
    // history, matching the recurring_rules is_active convention.
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goals').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalsKey(householdId) }),
  })
}

export function useDeleteGoal() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return useMutation({
    // Hard delete — cascades to goal_contributions. Use for a mistaken goal;
    // prefer Archive to keep history.
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalsKey(householdId) }),
  })
}

export function useContributions(goalId: string | null) {
  const householdId = useHouseholdId()
  return useQuery({
    queryKey: [...goalsKey(householdId), 'contributions', goalId],
    enabled: !!goalId,
    queryFn: async (): Promise<GoalContribution[]> => {
      const { data, error } = await supabase
        .from('goal_contributions')
        .select('*')
        .eq('goal_id', goalId as string)
        .order('contrib_date', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useAddContribution() {
  const householdId = useHouseholdId()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      goal_id: string
      amount: number
      contrib_date: string
      note?: string | null
    }) => {
      const { error } = await supabase.from('goal_contributions').insert({
        household_id: householdId,
        goal_id: input.goal_id,
        amount: input.amount,
        contrib_date: input.contrib_date,
        note: input.note ?? null,
        created_by: user?.id ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalsKey(householdId) }),
  })
}

export function useDeleteContribution() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goal_contributions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalsKey(householdId) }),
  })
}
