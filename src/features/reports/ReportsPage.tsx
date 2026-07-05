import { useState } from 'react'
import { Download } from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { exportCsv } from '@/lib/exportCsv'
import { useReports } from '@/features/reports/useReports'
import { InsightsSection } from '@/features/reports/InsightsSection'

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
]
const WINDOWS = [3, 6, 12]

const tooltipStyle = {
  background: 'var(--color-popover)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 12,
}

function compactMoney(v: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(v)
}

function monthLabel(m: string) {
  const [y, mo] = m.split('-').map(Number)
  return new Intl.DateTimeFormat('en-AU', { month: 'short', year: '2-digit' }).format(
    new Date(y, mo - 1, 1),
  )
}

export function ReportsPage() {
  const [months, setMonths] = useState(6)
  const { data, isLoading } = useReports(months)

  const spend = data?.spendByCategory ?? []
  const monthly = (data?.monthly ?? []).map((m) => ({ ...m, label: monthLabel(m.month) }))

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Reports</h1>

      <div className="flex gap-1 rounded-lg border p-1">
        {WINDOWS.map((w) => (
          <button
            key={w}
            onClick={() => setMonths(w)}
            className={cn(
              'flex-1 rounded-md py-1.5 text-sm font-medium transition-colors',
              months === w
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {w} months
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <>
          {/* Spend by category */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Spend by category
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  exportCsv(
                    `spend-by-category-${months}m.csv`,
                    spend.map((s) => ({ category: s.category, spend: s.spend.toFixed(2) })),
                  )
                }
              >
                <Download className="size-4" />
                CSV
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 p-4 sm:flex-row">
              {spend.length > 0 ? (
                <>
                  <ResponsiveContainer width={170} height={170}>
                    <PieChart>
                      <Pie
                        data={spend}
                        dataKey="spend"
                        nameKey="category"
                        innerRadius={45}
                        outerRadius={78}
                        paddingAngle={2}
                        isAnimationActive={false}
                      >
                        {spend.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatMoney(Number(v))} contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-1 flex-col gap-1.5">
                    {spend.slice(0, 8).map((s, i) => (
                      <div key={s.category} className="flex items-center gap-2 text-sm">
                        <span
                          className="size-3 rounded-full"
                          style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        <span className="flex-1 truncate">{s.category}</span>
                        <span className="font-mono tabular-nums">{formatMoney(s.spend)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="py-4 text-sm text-muted-foreground">No spending in this window.</p>
              )}
            </CardContent>
          </Card>

          {/* Income vs expense */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Income vs expense
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  exportCsv(
                    `income-vs-expense-${months}m.csv`,
                    monthly.map((m) => ({
                      month: m.month,
                      income: m.income.toFixed(2),
                      expense: m.expense.toFixed(2),
                      net: m.net.toFixed(2),
                    })),
                  )
                }
              >
                <Download className="size-4" />
                CSV
              </Button>
            </CardHeader>
            <CardContent className="p-2 pt-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthly} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={compactMoney}
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                  />
                  <Tooltip
                    formatter={(v, name) => [formatMoney(Number(v)), name as string]}
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" name="Income" fill="var(--color-income)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="expense" name="Expense" fill="var(--color-expense)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cashflow (net per month) */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cashflow (net per month)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthly} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={compactMoney}
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                  />
                  <Tooltip
                    formatter={(v) => [formatMoney(Number(v)), 'Net']}
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
                  />
                  <Bar dataKey="net" name="Net" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {monthly.map((m, i) => (
                      <Cell key={i} fill={m.net >= 0 ? 'var(--color-income)' : 'var(--color-expense)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Insights (extends Reports) */}
          {data && <InsightsSection report={data} months={months} />}
        </>
      )}
    </div>
  )
}
