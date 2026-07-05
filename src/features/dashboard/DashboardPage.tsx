import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthProvider'
import { useHousehold } from '@/features/household/HouseholdContext'
import { InviteSection } from '@/features/household/InviteSection'
import { useNetWorth } from '@/features/networth/useNetWorth'

export function DashboardPage() {
  const { user } = useAuth()
  const { household, membership } = useHousehold()
  const { data: netWorth, isLoading } = useNetWorth()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">{household.name}</h1>
        <p className="text-sm text-muted-foreground">Signed in as {user?.email}</p>
      </div>

      {/* Net worth headline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Net worth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              'font-mono text-3xl font-semibold tabular-nums',
              !isLoading && (netWorth?.net_worth ?? 0) < 0 && 'text-expense',
            )}
          >
            {isLoading ? '—' : formatMoney(netWorth?.net_worth ?? 0)}
          </p>
          {!isLoading && netWorth && (
            <div className="mt-3 flex gap-6 text-sm">
              <div>
                <p className="text-muted-foreground">Assets</p>
                <p className="font-mono tabular-nums text-income">
                  {formatMoney(netWorth.total_assets)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Liabilities</p>
                <p className="font-mono tabular-nums text-expense">
                  {formatMoney(netWorth.total_liabilities)}
                </p>
              </div>
            </div>
          )}
          <Link
            to="/accounts"
            className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline"
          >
            Manage accounts →
          </Link>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Budgets, the bills timeline, and net-worth trends arrive in the milestones ahead.
      </p>

      {/* Invite is surfaced here until Settings exists; only nudge when solo. */}
      {membership.role === 'owner' && (
        <InviteSection householdId={membership.household_id} />
      )}
    </div>
  )
}
