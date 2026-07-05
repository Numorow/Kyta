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
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { todayIso } from '@/lib/money'
import { useAccounts } from '@/features/accounts/useAccounts'
import { useCategories } from '@/features/categories/useCategories'
import {
  useUpdateRecurringRule,
  useUpsertRecurringRule,
  type RecurringRule,
} from '@/features/recurring/useRecurring'

const NONE = '__none__'

const schema = z.object({
  name: z.string().trim().min(1, 'Give this a name'),
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('Enter an amount greater than zero'),
  account_id: z.string(),
  category_id: z.string(),
  frequency: z.enum(['weekly', 'fortnightly', 'monthly', 'quarterly', 'annually']),
  interval_count: z.coerce.number().int().min(1),
  anchor_date: z.string().min(1),
  day_of_month: z.string(),
  end_date: z.string(),
  auto_post: z.boolean(),
})
type FormValues = z.input<typeof schema>

function defaults(rule?: RecurringRule): FormValues {
  return {
    name: rule?.name ?? '',
    type: (rule?.type as 'income' | 'expense') ?? 'expense',
    amount: rule?.amount ?? ('' as unknown as number),
    account_id: rule?.account_id ?? '',
    category_id: rule?.category_id ?? '',
    frequency: (rule?.frequency as FormValues['frequency']) ?? 'monthly',
    interval_count: rule?.interval_count ?? 1,
    anchor_date: rule?.anchor_date ?? todayIso(),
    day_of_month: rule?.day_of_month != null ? String(rule.day_of_month) : '',
    end_date: rule?.end_date ?? '',
    auto_post: rule?.auto_post ?? false,
  }
}

export function RecurringRuleFormDialog({
  open,
  onOpenChange,
  rule,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: RecurringRule
}) {
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()
  const upsert = useUpsertRecurringRule()
  const update = useUpdateRecurringRule()
  const isEdit = !!rule

  const { register, handleSubmit, control, watch, setValue, reset, formState } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults(rule) })

  useEffect(() => {
    if (open) reset(defaults(rule))
  }, [open, rule, reset])

  const type = watch('type')
  const frequency = watch('frequency')
  const categoryOptions = (categories ?? []).filter((c) => c.kind === type)
  const showDayOfMonth = frequency === 'monthly' || frequency === 'quarterly'

  const onSubmit = handleSubmit(async (raw) => {
    const values = schema.parse(raw)
    const payload = {
      name: values.name,
      type: values.type,
      amount: values.amount,
      account_id: values.account_id || null,
      category_id: values.category_id || null,
      frequency: values.frequency,
      interval_count: values.interval_count,
      anchor_date: values.anchor_date,
      day_of_month: showDayOfMonth && values.day_of_month ? Number(values.day_of_month) : null,
      end_date: values.end_date || null,
      auto_post: values.auto_post,
    }
    try {
      if (isEdit) {
        await update.mutateAsync({ id: rule.id, patch: payload })
        toast.success('Rule updated')
      } else {
        await upsert.mutateAsync(payload)
        toast.success('Rule added')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error).message)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit recurring' : 'New recurring'}</DialogTitle>
          <DialogDescription>A bill, subscription, or regular income.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      field.onChange(t)
                      setValue('category_id', '')
                    }}
                    className={cn(
                      'rounded-lg border py-2 text-sm font-medium capitalize',
                      field.value === t
                        ? t === 'expense'
                          ? 'border-expense bg-expense/10 text-expense'
                          : 'border-income bg-income/10 text-income'
                        : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {t === 'expense' ? 'Bill / expense' : 'Income'}
                  </button>
                ))}
              </div>
            )}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="rr-name">Name</Label>
            <Input id="rr-name" placeholder="e.g. Netflix" {...register('name')} />
            {formState.errors.name && (
              <p className="text-sm text-destructive">{formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rr-amount">Amount</Label>
              <Input
                id="rr-amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                {...register('amount')}
              />
              {formState.errors.amount && (
                <p className="text-sm text-destructive">{formState.errors.amount.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rr-anchor">Next due</Label>
              <Input id="rr-anchor" type="date" {...register('anchor_date')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Frequency</Label>
              <Controller
                control={control}
                name="frequency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="fortnightly">Fortnightly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rr-interval">Every</Label>
              <Input id="rr-interval" type="number" min="1" {...register('interval_count')} />
            </div>
          </div>

          {showDayOfMonth && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="rr-dom">Day of month (optional)</Label>
              <Input
                id="rr-dom"
                type="number"
                min="1"
                max="31"
                placeholder="e.g. 15 — clamps to month length"
                {...register('day_of_month')}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>Account</Label>
            <Controller
              control={control}
              name="account_id"
              render={({ field }) => (
                <Select
                  value={field.value || NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {(accounts ?? []).map((a) => (
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
            <Label>Category</Label>
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <Select
                  value={field.value || NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Uncategorised" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Uncategorised</SelectItem>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="rr-auto">Auto-post on due date</Label>
              <p className="text-xs text-muted-foreground">
                Off by default — post it yourself so amounts stay accurate.
              </p>
            </div>
            <Controller
              control={control}
              name="auto_post"
              render={({ field }) => (
                <Switch id="rr-auto" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={formState.isSubmitting}>
              {isEdit ? 'Save changes' : 'Add rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
