import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { formatMoney, todayIso } from '@/lib/money'
import { periodBounds, type BudgetPeriod } from '@/lib/period'
import { useCategories, type Category } from '@/features/categories/useCategories'
import {
  useBudgetProgress,
  useDeleteBudget,
  useUpdateBudget,
  useUpsertBudget,
  type BudgetProgress,
} from '@/features/budgets/useBudgets'

const PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
]

function ProgressBar({ spend, budget }: { spend: number; budget: number }) {
  const pct = budget > 0 ? Math.min((spend / budget) * 100, 100) : 0
  const over = spend > budget
  const near = !over && budget > 0 && spend / budget >= 0.8
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          'h-full rounded-full transition-all',
          over ? 'bg-expense' : near ? 'bg-warning' : 'bg-primary',
        )}
        style={{ width: `${over ? 100 : pct}%` }}
      />
    </div>
  )
}

function BudgetRow({
  category,
  progress,
  period,
}: {
  category: Category
  progress?: BudgetProgress
  period: BudgetPeriod
}) {
  const upsert = useUpsertBudget()
  const update = useUpdateBudget()
  const del = useDeleteBudget()
  const [draft, setDraft] = useState('')

  const commitNew = () => {
    const amount = Number(draft)
    if (!draft || Number.isNaN(amount) || amount <= 0) return
    // Anchor the budget to the current period's start so fortnightly cycles line up.
    const start = periodBounds(period, todayIso(), todayIso()).start
    upsert.mutate(
      { category_id: category.id, period, amount, rollover: false, start_date: start },
      {
        onSuccess: () => setDraft(''),
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }

  if (!progress) {
    return (
      <div className="flex items-center justify-between gap-3 py-3">
        <span className="text-sm font-medium">{category.name}</span>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            placeholder="Set budget"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitNew()}
            className="h-8 w-28"
          />
          <Button size="sm" variant="outline" onClick={commitNew} disabled={!draft}>
            Set
          </Button>
        </div>
      </div>
    )
  }

  const { spend, effectiveBudget, remaining, carry, budget } = progress
  const over = remaining < 0

  return (
    <div className="flex flex-col gap-1.5 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{category.name}</span>
        <span className="font-mono text-sm tabular-nums">
          {formatMoney(spend)}{' '}
          <span className="text-muted-foreground">/ {formatMoney(effectiveBudget)}</span>
        </span>
      </div>
      <ProgressBar spend={spend} budget={effectiveBudget} />
      <div className="flex items-center justify-between text-xs">
        <span className={cn(over ? 'text-expense' : 'text-muted-foreground')}>
          {over
            ? `${formatMoney(-remaining)} over`
            : `${formatMoney(remaining)} left`}
          {budget.rollover && carry !== 0 && (
            <span className="text-muted-foreground">
              {' '}· {carry >= 0 ? '+' : ''}
              {formatMoney(carry)} rolled over
            </span>
          )}
        </span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-muted-foreground">
            Rollover
            <Switch
              checked={budget.rollover}
              onCheckedChange={(v) => update.mutate({ id: budget.id, patch: { rollover: v } })}
            />
          </label>
          <button
            className="text-muted-foreground hover:text-destructive"
            onClick={() => del.mutate(budget.id)}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

export function BudgetsPage() {
  const [period, setPeriod] = useState<BudgetPeriod>('monthly')
  const { data: categories } = useCategories()
  const { data: progress, isLoading } = useBudgetProgress()

  const expenseCategories = (categories ?? []).filter((c) => c.kind === 'expense')
  const progressForPeriod = useMemo(() => {
    const map = new Map<string, BudgetProgress>()
    for (const p of progress ?? []) {
      if (p.budget.period === period) map.set(p.budget.category_id, p)
    }
    return map
  }, [progress, period])

  const totals = useMemo(() => {
    let budgeted = 0
    let spent = 0
    for (const p of progressForPeriod.values()) {
      budgeted += p.effectiveBudget
      spent += p.spend
    }
    return { budgeted, spent }
  }, [progressForPeriod])

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Budgets</h1>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/categories">
            <Settings2 className="size-4" />
            Categories
          </Link>
        </Button>
      </div>

      {/* Period toggle */}
      <div className="flex gap-1 rounded-lg border p-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={cn(
              'flex-1 rounded-md py-1.5 text-sm font-medium transition-colors',
              period === p.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {progressForPeriod.size > 0 && (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground">This {period.replace('ly', '')} period</span>
            <span className="font-mono text-sm tabular-nums">
              {formatMoney(totals.spent)}{' '}
              <span className="text-muted-foreground">/ {formatMoney(totals.budgeted)}</span>
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <div className="divide-y">
              {expenseCategories.map((c) => (
                <BudgetRow
                  key={c.id}
                  category={c}
                  progress={progressForPeriod.get(c.id)}
                  period={period}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
