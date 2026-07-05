import { Download, TrendingDown, TrendingUp } from 'lucide-react'
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatMoney, formatSignedMoney } from '@/lib/money'
import { exportCsv } from '@/lib/exportCsv'
import { savingsRateSeries, topMovers } from '@/lib/insights'
import type { ReportData } from '@/features/reports/useReports'

const tooltipStyle = {
  background: 'var(--color-popover)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 12,
}

function monthLabel(m: string) {
  const [y, mo] = m.split('-').map(Number)
  return new Intl.DateTimeFormat('en-AU', { month: 'short', year: '2-digit' }).format(
    new Date(y, mo - 1, 1),
  )
}

export function InsightsSection({ report, months }: { report: ReportData; months: number }) {
  const monthKeys = report.monthly.map((m) => m.month)
  const movers = topMovers(report.byCategoryMonth, monthKeys)
  const savings = savingsRateSeries(report.monthly).map((p) => ({
    label: monthLabel(p.month),
    pct: p.rate == null ? null : Math.round(p.rate * 100),
  }))
  const latest = [...savingsRateSeries(report.monthly)].reverse().find((p) => p.rate != null)

  return (
    <>
      {/* Savings rate */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Savings rate</CardTitle>
          {latest && (
            <span
              className={cn(
                'font-mono text-sm tabular-nums',
                latest.rate! >= 0 ? 'text-income' : 'text-expense',
              )}
            >
              {Math.round(latest.rate! * 100)}%
            </span>
          )}
        </CardHeader>
        <CardContent className="p-2 pt-4">
          {savings.some((s) => s.pct != null) ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={savings} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    formatter={(v) => [`${v}%`, 'Saved']}
                    contentStyle={tooltipStyle}
                    cursor={{ stroke: 'var(--color-muted)' }}
                  />
                  <ReferenceLine y={0} stroke="var(--color-border)" />
                  <Line
                    type="monotone"
                    dataKey="pct"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="px-2 pt-1 text-xs text-muted-foreground">
                Share of income kept each month. The latest month is still in progress.
              </p>
            </>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              Record some income to see your savings rate.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top movers */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Top movers (this month so far)
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            disabled={movers.length === 0}
            onClick={() =>
              exportCsv(
                `top-movers-${months}m.csv`,
                movers.map((m) => ({
                  category: m.category,
                  previous: m.prev.toFixed(2),
                  current: m.curr.toFixed(2),
                  change: m.delta.toFixed(2),
                })),
              )
            }
          >
            <Download className="size-4" />
            CSV
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          {movers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Not enough history yet to compare months.
            </p>
          ) : (
            <div className="divide-y">
              {movers.map((m) => {
                // Spending more is "bad" (red); spending less is good (green).
                const up = m.delta > 0
                return (
                  <div key={m.category} className="flex items-center gap-3 py-2.5">
                    {up ? (
                      <TrendingUp className="size-4 text-expense" />
                    ) : (
                      <TrendingDown className="size-4 text-income" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.isNew ? 'new this month' : `${formatMoney(m.prev)} → ${formatMoney(m.curr)}`}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'font-mono text-sm tabular-nums',
                        up ? 'text-expense' : 'text-income',
                      )}
                    >
                      {formatSignedMoney(m.delta)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
