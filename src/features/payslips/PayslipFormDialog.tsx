import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatMoney, todayIso } from '@/lib/money'
import { useAccounts } from '@/features/accounts/useAccounts'
import { useCreatePayslip } from '@/features/payslips/usePayslips'

const NONE = '__none__'

const schema = z.object({
  member_label: z.string().trim().optional(),
  employer: z.string().trim().optional(),
  pay_date: z.string().min(1),
  gross: z.coerce.number().positive('Enter gross pay'),
  tax: z.coerce.number().min(0),
  deductions: z.coerce.number().min(0),
  super: z.coerce.number().min(0),
  deposit_account_id: z.string(),
  super_account_id: z.string(),
})
type FormValues = z.input<typeof schema>

export function PayslipFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: accounts } = useAccounts()
  const create = useCreatePayslip()

  const assetAccounts = (accounts ?? []).filter((a) => a.class === 'asset')
  const superAccounts = (accounts ?? []).filter((a) => a.subtype === 'superannuation')

  const { register, handleSubmit, control, watch, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      member_label: '',
      employer: '',
      pay_date: todayIso(),
      gross: '' as unknown as number,
      tax: '' as unknown as number,
      deductions: 0,
      super: '' as unknown as number,
      deposit_account_id: '',
      super_account_id: '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        member_label: '',
        employer: '',
        pay_date: todayIso(),
        gross: '' as unknown as number,
        tax: '' as unknown as number,
        deductions: 0,
        super: '' as unknown as number,
        deposit_account_id: assetAccounts.find((a) => a.subtype === 'transaction')?.id ?? '',
        super_account_id: superAccounts[0]?.id ?? '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, accounts])

  // Net = gross − PAYG − other deductions (super guarantee is on top, not deducted).
  const gross = Number(watch('gross')) || 0
  const tax = Number(watch('tax')) || 0
  const deductions = Number(watch('deductions')) || 0
  const net = Math.max(gross - tax - deductions, 0)

  const superAccountId = watch('super_account_id')
  const selectedSuper = superAccounts.find((a) => a.id === superAccountId)
  const superIsStatement = selectedSuper?.balance_mode === 'statement'

  const onSubmit = handleSubmit(async (raw) => {
    const values = schema.parse(raw)
    try {
      await create.mutateAsync({
        member_label: values.member_label || null,
        employer: values.employer || null,
        pay_date: values.pay_date,
        gross: values.gross,
        tax: values.tax,
        deductions: values.deductions,
        super: values.super,
        net: values.gross - values.tax - values.deductions,
        deposit_account_id: values.deposit_account_id || null,
        super_account_id: values.super_account_id || null,
        superIsTracked: selectedSuper?.balance_mode === 'tracked',
      })
      toast.success('Payslip recorded')
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error).message)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payslip</DialogTitle>
          <DialogDescription>
            Gross, tax, and super — the net lands in your bank account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ps-who">Who</Label>
              <Input id="ps-who" placeholder="e.g. Kyle" {...register('member_label')} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ps-date">Pay date</Label>
              <Input id="ps-date" type="date" {...register('pay_date')} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ps-employer">Employer</Label>
            <Input id="ps-employer" placeholder="e.g. Kyron Events" {...register('employer')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ps-gross">Gross pay</Label>
              <Input id="ps-gross" type="number" step="0.01" inputMode="decimal" {...register('gross')} />
              {formState.errors.gross && (
                <p className="text-sm text-destructive">{formState.errors.gross.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ps-tax">PAYG tax</Label>
              <Input id="ps-tax" type="number" step="0.01" inputMode="decimal" {...register('tax')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ps-ded">Other deductions</Label>
              <Input id="ps-ded" type="number" step="0.01" inputMode="decimal" {...register('deductions')} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ps-super">Super (SG)</Label>
              <Input id="ps-super" type="number" step="0.01" inputMode="decimal" {...register('super')} />
            </div>
          </div>

          {/* Live net */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
            <span className="text-sm text-muted-foreground">Net (lands in bank)</span>
            <span className="font-mono text-sm font-semibold tabular-nums text-income">
              {formatMoney(net)}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Deposit account</Label>
            <Controller
              control={control}
              name="deposit_account_id"
              render={({ field }) => (
                <Select
                  value={field.value || NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None (don't post to bank)</SelectItem>
                    {assetAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Super account</Label>
            <Controller
              control={control}
              name="super_account_id"
              render={({ field }) => (
                <Select
                  value={field.value || NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a super account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {superAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {superAccountId && superAccountId !== NONE && (
              <p className="text-xs text-muted-foreground">
                {superIsStatement
                  ? 'Statement-tracked super: the contribution is captured for year-to-date reporting; update the balance from your fund statements.'
                  : "Tracked super: the contribution is added to this account's balance."}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={formState.isSubmitting}>
              Record payslip
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
