import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { useHouseholdId } from '@/features/household/HouseholdContext'
import { supabase } from '@/lib/supabase'

// The two-person "2Up" identity layer: resolve a user_id (e.g. transactions.
// created_by) to a person with a stable name, initials, and colour so the app
// can show who added / contributed what.

export type Member = {
  userId: string
  role: string
  email: string
  name: string // display_name, or the email local-part as a fallback
  initials: string
  colorIndex: number
  isYou: boolean
}

// Avatar colours, assigned by member order so the two people stay visually
// distinct and consistent across screens.
export const MEMBER_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
]

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function membersKey(householdId: string) {
  return ['members', householdId]
}

/** Household members with computed display identity. */
export function useMembers() {
  const householdId = useHouseholdId()
  const { user } = useAuth()

  return useQuery({
    queryKey: membersKey(householdId),
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await supabase.rpc('household_members_detail', { hid: householdId })
      if (error) throw error
      // Stable order (owner first, then email) so colours/positions don't shuffle.
      const sorted = [...data].sort((a, b) =>
        a.role === b.role ? a.email.localeCompare(b.email) : a.role === 'owner' ? -1 : 1,
      )
      return sorted.map((m, i) => {
        const name = m.display_name?.trim() || m.email.split('@')[0]
        return {
          userId: m.user_id,
          role: m.role,
          email: m.email,
          name,
          initials: initialsOf(name),
          colorIndex: i % MEMBER_COLORS.length,
          isYou: m.user_id === user?.id,
        }
      })
    },
  })
}

/** Members plus a `created_by` → member resolver and you/partner shortcuts. */
export function useMemberLookup() {
  const query = useMembers()
  const members = query.data ?? []
  const byId = new Map(members.map((m) => [m.userId, m]))
  const you = members.find((m) => m.isYou) ?? null
  const partner = members.find((m) => !m.isYou) ?? null
  return { ...query, members, byId, you, partner }
}
