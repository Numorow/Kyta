import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, formatMoney } from '@/lib/money'
import { exportCsv } from '@/lib/exportCsv'
import { Download } from 'lucide-react'
import {
  useDeletePayslip,
  usePayslips,
  useYtdTotals,
  type Payslip,
} from '@/features/payslips/usePayslips'
import { PayslipFormDialog } from '@/features/payslips/PayslipFormDialog'

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-lg font-semibold tabular-nums">{formatMoney(value)}</p>
    </div>
  )
}

function PayslipRow({ slip }: { slip: Payslip }) {
  const del = useDeletePayslip()
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {slip.employer || 'Pay'}
          {slip.member_label && (
            <span className="text-muted-foreground"> · {slip.member_label}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDate(slip.pay_date)} · gross {formatMoney(Number(slip.gross))} · tax{' '}
          {formatMoney(Number(slip.tax))} · super {formatMoney(Number(slip.super))}
        </p>
      </div>
      <span className="font-mono text-sm tabular-nums text-income">
        {formatMoney(Number(slip.net))}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground hover:text-destructive"
        onClick={() =>
          del.mutate(slip, { onError: (e) => toast.error((e as Error).message) })
        }
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

export function PayslipsPage() {
  const { data: payslips, isLoading } = usePayslips()
  const ytd = useYtdTotals()
  const [adding, setAdding] = useState(false)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Income</h1>
        <Button onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          Payslip
        </Button>
      </div>

      {/* Financial-year-to-date */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              This financial year
            </span>
            <Badge variant="secondary">since {formatDate(ytd.fyStart)}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Gross" value={ytd.gross} />
            <Stat label="PAYG tax" value={ytd.tax} />
            <Stat label="Super" value={ytd.super} />
            <Stat label="Net" value={ytd.net} />
          </div>
        </CardContent>
      </Card>

      {/* Payslip history */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">Payslips</p>
            {payslips && payslips.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  exportCsv(
                    'payslips.csv',
                    payslips.map((p) => ({
                      pay_date: p.pay_date,
                      who: p.member_label ?? '',
                      employer: p.employer ?? '',
                      gross: Number(p.gross).toFixed(2),
                      tax: Number(p.tax).toFixed(2),
                      deductions: Number(p.deductions).toFixed(2),
                      super: Number(p.super).toFixed(2),
                      net: Number(p.net).toFixed(2),
                    })),
                  )
                }
              >
                <Download className="size-4" />
                CSV
              </Button>
            )}
          </div>
          {isLoading ? (
            <p className="py-4 text-sm text-muted-foreground">Loading…</p>
          ) : !payslips || payslips.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No payslips yet. Record one to track gross, tax, and super.
            </p>
          ) : (
            <div className="divide-y">
              {payslips.map((slip) => (
                <PayslipRow key={slip.id} slip={slip} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PayslipFormDialog open={adding} onOpenChange={setAdding} />
    </div>
  )
}
