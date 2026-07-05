import { useState } from 'react'
import { TrendingDown } from 'lucide-react'
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDate, formatMoney } from '@/lib/money'
import { useForecast } from '@/features/forecast/useForecast'

const WINDOWS = [30, 60, 90]

function compactMoney(v: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(v)
}

export function ForecastPage() {
  const [days, setDays] = useState(30)
  const { data: forecast, isLoading } = useForecast(days)

  const chartData = (forecast?.series ?? []).map((d) => ({ date: d.date, balance: d.closing }))
  const minPoint = forecast?.minPoint
  const dips = forecast?.dips ?? []
  const threshold = forecast?.threshold ?? 0

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Cashflow forecast</h1>
        <p className="text-sm text-muted-foreground">
          Projected spendable cash from your recurring bills &amp; income.
        </p>
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

      {/* Lowest projected balance */}
      {minPoint && (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Lowest projected balance</p>
              <p
                className={cn(
                  'font-mono text-2xl font-semibold tabular-nums',
                  minPoint.balance < 0 && 'text-expense',
                )}
              >
                {formatMoney(minPoint.balance)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">on {formatDate(minPoint.date)}</p>
          </CardContent>
        </Card>
      )}

      {/* Projected balance chart */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Projected balance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-4">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : chartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => formatDate(d).slice(0, 5)}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                />
                <YAxis
                  tickFormatter={compactMoney}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip
                  formatter={(v) => [formatMoney(Number(v)), 'Balance']}
                  labelFormatter={(d) => formatDate(d as string)}
                  contentStyle={{
                    background: 'var(--color-popover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                {/* Warning line at the threshold (below = cash dip). */}
                <ReferenceLine y={threshold} stroke="var(--color-warning)" strokeDasharray="4 4" />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  fill="url(#forecast)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Add recurring bills or income to see a forecast.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Cash dips */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Cash dips</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {dips.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projected dips below {formatMoney(threshold)} in the next {days} days. 🎉
            </p>
          ) : (
            <div className="divide-y">
              {dips.map((dip) => (
                <div key={dip.date} className="flex items-center gap-3 py-2.5">
                  <TrendingDown className="size-4 text-expense" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{formatDate(dip.date)}</p>
                    <p className="text-xs text-muted-foreground">in {dip.daysUntil} days</p>
                  </div>
                  <span className="font-mono text-sm tabular-nums text-expense">
                    {formatMoney(dip.balance)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
