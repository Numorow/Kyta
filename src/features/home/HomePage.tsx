import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/features/auth/AuthProvider'
import { CreateHouseholdPage } from '@/features/household/CreateHouseholdPage'
import { InviteSection } from '@/features/household/InviteSection'
import { useMyHousehold } from '@/features/household/useHousehold'
import { supabase } from '@/lib/supabase'

export function HomePage() {
  const { user } = useAuth()
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

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{myHousehold.household.name}</h1>
          <p className="text-sm text-muted-foreground">Signed in as {user?.email}</p>
        </div>
        <ThemeToggle />
      </div>

      <p className="text-sm text-muted-foreground">
        Accounts, transactions, budgets, bills, and net worth land in the milestones ahead.
      </p>

      <InviteSection householdId={myHousehold.membership.household_id} />

      <Button variant="outline" onClick={() => supabase.auth.signOut()}>
        Sign out
      </Button>
    </div>
  )
}
