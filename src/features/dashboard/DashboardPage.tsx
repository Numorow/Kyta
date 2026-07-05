import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Plus } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { amountColorClass, formatDate, formatMoney, formatSignedMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { useHousehold } from '@/features/household/HouseholdContext'
import { useNetWorth, useNetWorthHistory } from '@/features/networth/useNetWorth'
import { useBudgetProgress } from '@/features/budgets/useBudgets'
import { useTimeline } from '@/features/recurring/useRecurring'
import { useTransactions } from '@/features/transactions/useTransactions'
import { useCategoryMap } from '@/features/categories/useCategories'
import { TransactionFormDialog } from '@/features/transactions/TransactionFormDialog'
import { useCashflowSummary, type CashflowPeriod } from '@/features/dashboard/useDashboard'

function SectionCard({
  title,
  to,
  children,
}: {
  title: string
  to?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {to && (
          <Link to={to} className="text-muted-foreground hover:text-foreground">
            <ArrowRight className="size-4" />
          </Link>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function NetWorthCard() {
  const { data: nw } = useNetWorth()
  const { data: history } = useNetWorthHistory()
  const spark = (history ?? []).map((s) => ({ net: Number(s.net_worth) }))
  const last = history && history.length > 0 ? history[history.length - 1] : undefined
  const delta = last ? (nw?.net_worth ?? 0) - Number(last.net_worth) : 0

  return (
    <SectionCard title="Net worth" to="/net-worth">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p
            className={cn(
              'font-mono text-2xl font-semibold tabular-nums',
              (nw?.net_worth ?? 0) < 0 && 'text-expense',
            )}
          >
            {formatMoney(nw?.net_worth ?? 0)}
          </p>
          {last && (
            <p className={cn('text-xs', delta >= 0 ? 'text-income' : 'text-expense')}>
              {formatSignedMoney(delta)} since {formatDate(last.snapshot_date)}
            </p>
          )}
        </div>
        {spark.length >= 2 && (
          <div className="h-10 w-28">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
                <Area
                  type="monotone"
                  dataKey="net"
                  stroke="var(--color-chart-2)"
                  strokeWidth={1.5}
                  fill="var(--color-chart-2)"
                  fillOpacity={0.15}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function CashflowCard() {
  const [period, setPeriod] = useState<CashflowPeriod>('month')
  const { data } = useCashflowSummary(period)
  const income = data?.income ?? 0
  const expense = data?.expense ?? 0
  const total = income + expense || 1
  const inPct = (income / total) * 100

  return (
    <SectionCard title="Money in vs out" to="/reports">
      <div className="mb-3 flex gap-1 rounded-md border p-0.5 text-xs">
        {(['month', 'fortnight'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'flex-1 rounded py-1 font-medium capitalize',
              period === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
            )}
          >
            {p === 'month' ? 'This month' : 'Fortnight'}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-sm">
        <div>
          <p className="text-xs text-muted-foreground">In</p>
          <p className="font-mono tabular-nums text-income">{formatMoney(income)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Out</p>
          <p className="font-mono tabular-nums text-expense">{formatMoney(expense)}</p>
        </div>
      </div>
      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-muted">
        <div className="bg-income" style={{ width: `${inPct}%` }} />
        <div className="bg-expense" style={{ width: `${100 - inPct}%` }} />
      </div>
      <p className={cn('mt-2 text-xs', income - expense >= 0 ? 'text-income' : 'text-expense')}>
        Net {formatSignedMoney(income - expense)}
      </p>
    </SectionCard>
  )
}

function BudgetHealthCard() {
  const { data: progress } = useBudgetProgress()
  // Surface the budgets closest to (or over) their limit this period.
  const ranked = (progress ?? [])
    .filter((p) => p.budget.period === 'monthly')
    .map((p) => ({ ...p, ratio: p.effectiveBudget > 0 ? p.spend / p.effectiveBudget : 0 }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 4)
  const { byId } = useCategoryMap()

  return (
    <SectionCard title="Budget health" to="/budgets">
      {ranked.length === 0 ? (
        <p className="text-sm text-muted-foreground">No monthly budgets set.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {ranked.map((p) => {
            const over = p.remaining < 0
            const pct = Math.min(p.ratio * 100, 100)
            return (
              <div key={p.budget.id}>
                <div className="flex justify-between text-xs">
                  <span>{byId.get(p.budget.category_id)?.name ?? 'Category'}</span>
                  <span className={cn('font-mono tabular-nums', over && 'text-expense')}>
                    {formatMoney(p.spend)} / {formatMoney(p.effectiveBudget)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full', over ? 'bg-expense' : p.ratio >= 0.8 ? 'bg-warning' : 'bg-primary')}
                    style={{ width: `${over ? 100 : pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

function UpcomingBillsCard() {
  const { data: timeline } = useTimeline(14)
  const upcoming = (timeline ?? []).filter((o) => !o.paid).slice(0, 5)
  const total = upcoming.reduce((sum, o) => sum + o.signedAmount, 0)

  return (
    <SectionCard title="Upcoming (14 days)" to="/bills">
      {upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing due soon.</p>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            {upcoming.map((o, i) => (
              <div key={`${o.ruleId}-${i}`} className="flex items-center justify-between gap-2 text-sm">
                <span className="w-12 shrink-0 text-xs text-muted-foreground">
                  {formatDate(o.date).slice(0, 5)}
                </span>
                <span className="flex-1 truncate">{o.name}</span>
                <span className={cn('font-mono text-xs tabular-nums', amountColorClass(o.signedAmount))}>
                  {formatSignedMoney(o.signedAmount)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
            Net over 14 days:{' '}
            <span className={cn('font-mono tabular-nums', amountColorClass(total))}>
              {formatSignedMoney(total)}
            </span>
          </p>
        </>
      )}
    </SectionCard>
  )
}

function RecentTransactionsCard() {
  const { data: rows } = useTransactions({})
  const recent = (rows ?? []).slice(0, 8)
  const [adding, setAdding] = useState(false)

  return (
    <Card className="md:col-span-2">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Recent transactions
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          Quick add
        </Button>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="divide-y">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-12 shrink-0 text-xs text-muted-foreground">
                  {formatDate(t.txn_date).slice(0, 5)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {t.description || t.categories?.name || t.accounts?.name || '—'}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:block">
                  {t.accounts?.name}
                </span>
                <span className={cn('font-mono tabular-nums', amountColorClass(t.amount))}>
                  {formatSignedMoney(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <TransactionFormDialog open={adding} onOpenChange={setAdding} />
    </Card>
  )
}

export function DashboardPage() {
  const { household } = useHousehold()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">{household.name}</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <NetWorthCard />
        <CashflowCard />
        <BudgetHealthCard />
        <UpcomingBillsCard />
        <RecentTransactionsCard />
      </div>
    </div>
  )
}
