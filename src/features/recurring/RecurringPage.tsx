import { useState } from 'react'
import { CalendarClock, Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { amountColorClass, formatDate, formatMoney, formatSignedMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import {
  useDeleteRecurringRule,
  useMarkOccurrencePaid,
  useRecurringRules,
  useTimeline,
  type Occurrence,
  type RecurringRule,
} from '@/features/recurring/useRecurring'
import { RecurringRuleFormDialog } from '@/features/recurring/RecurringRuleFormDialog'

const WINDOWS = [14, 30, 60, 90]

function OccurrenceRow({
  occ,
  rule,
}: {
  occ: Occurrence
  rule?: RecurringRule
}) {
  const markPaid = useMarkOccurrencePaid()
  const dip = occ.runningBalance < 0

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-20 shrink-0 text-xs text-muted-foreground">{formatDate(occ.date)}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{occ.name}</p>
        <p className={cn('text-xs', dip ? 'text-expense' : 'text-muted-foreground')}>
          Projected balance {formatMoney(occ.runningBalance)}
        </p>
      </div>
      <span
        className={cn('font-mono text-sm tabular-nums', amountColorClass(occ.signedAmount))}
      >
        {formatSignedMoney(occ.signedAmount)}
      </span>
      {occ.paid ? (
        <Badge variant="secondary" className="w-24 justify-center">
          <Check className="size-3" /> Paid
        </Badge>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="w-24"
          disabled={markPaid.isPending || !rule}
          onClick={() =>
            rule &&
            markPaid.mutate(
              { rule, date: occ.date },
              { onError: (e) => toast.error((e as Error).message) },
            )
          }
        >
          Mark paid
        </Button>
      )}
    </div>
  )
}

function RuleRow({ rule, onEdit }: { rule: RecurringRule; onEdit: () => void }) {
  const del = useDeleteRecurringRule()
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{rule.name}</p>
        <p className="text-xs capitalize text-muted-foreground">
          {rule.interval_count > 1 ? `every ${rule.interval_count} ` : ''}
          {rule.frequency}
          {rule.next_due_date ? ` · next ${formatDate(rule.next_due_date)}` : ''}
          {rule.auto_post ? ' · auto' : ''}
        </p>
      </div>
      <span className={cn('font-mono text-sm tabular-nums', amountColorClass(rule.type === 'expense' ? -1 : 1))}>
        {formatMoney(rule.amount)}
      </span>
      <Button variant="ghost" size="icon" className="size-8" onClick={onEdit}>
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground hover:text-destructive"
        onClick={() => del.mutate(rule.id)}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

export function RecurringPage() {
  const [days, setDays] = useState(30)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<RecurringRule | undefined>()

  const { data: rules } = useRecurringRules()
  const { data: timeline, isLoading } = useTimeline(days)
  const ruleById = new Map((rules ?? []).map((r) => [r.id, r]))

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bills &amp; income</h1>
        <Button onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {/* Window toggle */}
      <div className="flex gap-1 rounded-lg border p-1">
        {WINDOWS.map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={cn(
              'flex-1 rounded-md py-1.5 text-sm font-medium transition-colors',
              days === d
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {d} days
          </button>
        ))}
      </div>

      {/* Timeline */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <CalendarClock className="size-4" />
            Upcoming
          </div>
          {isLoading ? (
            <p className="py-4 text-sm text-muted-foreground">Loading…</p>
          ) : !timeline || timeline.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing due in the next {days} days.
            </p>
          ) : (
            <div className="divide-y">
              {timeline.map((occ, i) => (
                <OccurrenceRow key={`${occ.ruleId}-${occ.date}-${i}`} occ={occ} rule={ruleById.get(occ.ruleId)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rules */}
      <Card>
        <CardContent className="p-4">
          <p className="mb-1 text-sm font-semibold text-muted-foreground">All rules</p>
          {rules && rules.length > 0 ? (
            <div className="divide-y">
              {rules.map((r) => (
                <RuleRow key={r.id} rule={r} onEdit={() => setEditing(r)} />
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No recurring rules yet. Add a bill, subscription, or your wage.
            </p>
          )}
        </CardContent>
      </Card>

      <RecurringRuleFormDialog open={adding} onOpenChange={setAdding} />
      <RecurringRuleFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(undefined)}
        rule={editing}
      />
    </div>
  )
}
