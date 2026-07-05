import { createContext, useContext, type ReactNode } from 'react'
import { CreateHouseholdPage } from '@/features/household/CreateHouseholdPage'
import { useMyHousehold, type MyHousehold } from '@/features/household/useHousehold'

const HouseholdContext = createContext<MyHousehold | undefined>(undefined)

/**
 * Gate + provider for everything behind auth. Shows onboarding when the user
 * has no household yet; otherwise provides the current household to all
 * descendant screens so none of them re-query membership.
 */
export function HouseholdGate({ children }: { children: ReactNode }) {
  const { data: myHousehold, isLoading } = useMyHousehold()

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!myHousehold) {
    return <CreateHouseholdPage />
  }

  return <HouseholdContext.Provider value={myHousehold}>{children}</HouseholdContext.Provider>
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext)
  if (!ctx) throw new Error('useHousehold must be used within HouseholdGate')
  return ctx
}

/** Convenience: the current household_id (the scope key for every query). */
export function useHouseholdId() {
  return useHousehold().membership.household_id
}
