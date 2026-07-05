import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDate, formatMoney } from '@/lib/money'
import { useForecast } from '@/features/forecast/useForecast'

/** Dashboard summary of the 30-day cashflow forecast (brief §8.1). */
export function CashflowForecastCard() {
  const { data: forecast } = useForecast(30)
  const spark = (forecast?.series ?? []).map((d) => ({ balance: d.closing }))
  const min = forecast?.minPoint

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Cash forecast (30 days)
        </CardTitle>
        <Link to="/forecast" className="text-muted-foreground hover:text-foreground">
          <ArrowRight className="size-4" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Lowest projected</p>
            <p
              className={cn(
                'font-mono text-2xl font-semibold tabular-nums',
                (min?.balance ?? 0) < 0 && 'text-expense',
              )}
            >
              {formatMoney(min?.balance ?? 0)}
            </p>
            {min && <p className="text-xs text-muted-foreground">on {formatDate(min.date)}</p>}
          </div>
          {spark.length >= 2 && (
            <div className="h-10 w-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spark} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="var(--color-chart-1)"
                    strokeWidth={1.5}
                    fill="var(--color-chart-1)"
                    fillOpacity={0.15}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
