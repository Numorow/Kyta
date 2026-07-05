import { CameraIcon } from 'lucide-react'
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatMoney, formatSignedMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import {
  useAssetAllocation,
  useNetWorth,
  useNetWorthHistory,
  useTakeSnapshot,
} from '@/features/networth/useNetWorth'

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
]

function compactMoney(v: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(v)
}

export function NetWorthPage() {
  const { data: nw } = useNetWorth()
  const { data: history } = useNetWorthHistory()
  const { allocation } = useAssetAllocation()
  const takeSnapshot = useTakeSnapshot()

  const netWorth = nw?.net_worth ?? 0
  const last = history && history.length > 0 ? history[history.length - 1] : undefined
  // numeric columns arrive from PostgREST as strings — coerce for arithmetic/charts.
  const delta = last ? netWorth - Number(last.net_worth) : 0

  const chartData = (history ?? []).map((s) => ({
    date: s.snapshot_date,
    net: Number(s.net_worth),
  }))

  const doSnapshot = () =>
    takeSnapshot.mutate(undefined, {
      onSuccess: () => toast.success('Snapshot saved'),
      onError: (e) => toast.error((e as Error).message),
    })

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Net worth</h1>
        <Button variant="outline" onClick={doSnapshot} disabled={takeSnapshot.isPending}>
          <CameraIcon className="size-4" />
          Take snapshot
        </Button>
      </div>

      {/* Headline + assets/liabilities */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Current equity</p>
          <p
            className={cn(
              'font-mono text-3xl font-semibold tabular-nums',
              netWorth < 0 && 'text-expense',
            )}
          >
            {formatMoney(netWorth)}
          </p>
          {last && (
            <p className={cn('text-sm', delta >= 0 ? 'text-income' : 'text-expense')}>
              {formatSignedMoney(delta)} since {formatDate(last.snapshot_date)}
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Assets</p>
              <p className="font-mono tabular-nums text-income">
                {formatMoney(nw?.total_assets ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Liabilities</p>
              <p className="font-mono tabular-nums text-expense">
                {formatMoney(nw?.total_liabilities ?? 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trend */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Trend</CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-4">
          {chartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => formatDate(d).slice(0, 5)}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={compactMoney}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip
                  formatter={(v) => [formatMoney(Number(v)), 'Net worth']}
                  labelFormatter={(d) => formatDate(d as string)}
                  contentStyle={{
                    background: 'var(--color-popover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="net"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                  fill="url(#nw)"
                  // The left-to-right reveal clip can stick at ~0 width if a
                  // refetch re-renders mid-animation; render the full area.
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Take a couple of snapshots to see your net worth trend.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Allocation */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Asset allocation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 p-4 sm:flex-row">
          {allocation.length > 0 ? (
            <>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={allocation}
                    dataKey="value"
                    nameKey="bucket"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {allocation.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatMoney(Number(v))}
                    contentStyle={{
                      background: 'var(--color-popover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-1 flex-col gap-2">
                {allocation.map((slice, i) => (
                  <div key={slice.bucket} className="flex items-center gap-2 text-sm">
                    <span
                      className="size-3 rounded-full"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="flex-1">{slice.bucket}</span>
                    <span className="font-mono tabular-nums">{formatMoney(slice.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">No assets yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
