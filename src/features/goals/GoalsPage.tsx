import { useState } from 'react'
import { ChevronDown, MoreVertical, Plus, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { formatDate, formatMoney, formatSignedMoney } from '@/lib/money'
import { MemberAvatar } from '@/features/household/MemberAvatar'
import { useMemberLookup } from '@/features/household/useMembers'
import { GoalFormDialog } from '@/features/goals/GoalFormDialog'
import { ContributionDialog } from '@/features/goals/ContributionDialog'
import {
  useArchiveGoal,
  useContributions,
  useDeleteGoal,
  useDeleteContribution,
  useGoalProgress,
  type GoalProgress,
} from '@/features/goals/useGoals'

function ProgressBar({ pct }: { pct: number }) {
  const reached = pct >= 1
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn('h-full rounded-full transition-all', reached ? 'bg-income' : 'bg-primary')}
        style={{ width: `${Math.min(Math.max(pct, 0), 1) * 100}%` }}
      />
    </div>
  )
}

function Contributions({ goalId }: { goalId: string }) {
  const { data: contributions, isLoading } = useContributions(goalId)
  const del = useDeleteContribution()
  const { byId, members } = useMemberLookup()
  const twoPerson = members.length > 1

  if (isLoading) return <p className="py-2 text-xs text-muted-foreground">Loading…</p>
  if (!contributions || contributions.length === 0) {
    return <p className="py-2 text-xs text-muted-foreground">No contributions yet.</p>
  }
  return (
    <div className="divide-y">
      {contributions.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
          <div className="min-w-0">
            <span className="font-mono tabular-nums">{formatSignedMoney(Number(c.amount))}</span>
            {c.note && <span className="ml-2 text-muted-foreground">{c.note}</span>}
          </div>
          <div className="flex items-center gap-3">
            {twoPerson && (
              <MemberAvatar
                member={c.created_by ? (byId.get(c.created_by) ?? null) : null}
                size="xs"
              />
            )}
            <span className="text-xs text-muted-foreground">{formatDate(c.contrib_date)}</span>
            <button
              className="text-xs text-muted-foreground hover:text-destructive"
              onClick={() => del.mutate(c.id)}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function GoalCard({ progress }: { progress: GoalProgress }) {
  const { goal, saved, pct, remaining, linkedBalance, perMonthNeeded } = progress
  const [editing, setEditing] = useState(false)
  const [contributing, setContributing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const archive = useArchiveGoal()
  const del = useDeleteGoal()
  const reached = remaining <= 0

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{goal.name}</p>
            {goal.target_date && (
              <Badge variant="secondary" className="mt-1 text-xs">
                by {formatDate(goal.target_date)}
              </Badge>
            )}
          </div>
          <span className="font-mono text-sm tabular-nums">
            {formatMoney(saved)}{' '}
            <span className="text-muted-foreground">/ {formatMoney(Number(goal.target_amount))}</span>
          </span>
        </div>

        <ProgressBar pct={pct} />

        <div className="flex items-center justify-between text-xs">
          <span className={cn(reached ? 'text-income' : 'text-muted-foreground')}>
            {reached ? 'Reached 🎉' : `${formatMoney(remaining)} to go`}
            {!reached && perMonthNeeded != null && (
              <span className="text-muted-foreground">
                {' '}· {formatMoney(perMonthNeeded)}/mo needed
              </span>
            )}
          </span>
          <span className="text-muted-foreground">{Math.round(pct * 100)}%</span>
        </div>

        {linkedBalance != null && (
          <p className="text-xs text-muted-foreground">
            Linked account balance: {formatMoney(linkedBalance)}
          </p>
        )}

        <div className="mt-1 flex items-center justify-between">
          <Button size="sm" variant="outline" onClick={() => setContributing(true)}>
            <Plus className="size-4" />
            Add
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setExpanded((v) => !v)}
            >
              History
              <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditing(true)}>Edit</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => archive.mutate(goal.id)}>Archive</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => del.mutate(goal.id)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {expanded && (
          <div className="mt-1 border-t pt-1">
            <Contributions goalId={goal.id} />
          </div>
        )}
      </CardContent>

      <GoalFormDialog open={editing} onOpenChange={setEditing} goal={goal} />
      <ContributionDialog open={contributing} onOpenChange={setContributing} goal={goal} />
    </Card>
  )
}

export function GoalsPage() {
  const { data: goals, isLoading } = useGoalProgress()
  const [adding, setAdding] = useState(false)

  const totalSaved = (goals ?? []).reduce((sum, g) => sum + g.saved, 0)
  const totalTarget = (goals ?? []).reduce((sum, g) => sum + Number(g.goal.target_amount), 0)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Goals</h1>
          {(goals?.length ?? 0) > 0 && (
            <p className="text-sm text-muted-foreground">
              {formatMoney(totalSaved)} saved of {formatMoney(totalTarget)}
            </p>
          )}
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          New goal
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (goals?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <Target className="size-8 text-muted-foreground" />
            <p className="font-medium">No goals yet</p>
            <p className="text-sm text-muted-foreground">
              Create a savings goal and log contributions to track your progress.
            </p>
          </CardContent>
        </Card>
      ) : (
        goals!.map((p) => <GoalCard key={p.goal.id} progress={p} />)
      )}

      <GoalFormDialog open={adding} onOpenChange={setAdding} />
    </div>
  )
}
