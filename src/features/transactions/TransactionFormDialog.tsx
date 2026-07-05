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
import { cn } from '@/lib/utils'
import { todayIso } from '@/lib/money'
import { useAccounts } from '@/features/accounts/useAccounts'
import { useCategories } from '@/features/categories/useCategories'
import { useCreateTransaction } from '@/features/transactions/useTransactions'

const schema = z.object({
  account_id: z.string().min(1, 'Choose an account'),
  txn_date: z.string().min(1),
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('Enter an amount greater than zero'),
  category_id: z.string(),
  description: z.string().trim().optional(),
})
type FormValues = z.input<typeof schema>

export function TransactionFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()
  const createTransaction = useCreateTransaction()

  const { register, handleSubmit, control, watch, setValue, reset, formState } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        account_id: '',
        txn_date: todayIso(),
        type: 'expense',
        amount: '' as unknown as number,
        category_id: '',
        description: '',
      },
    })

  useEffect(() => {
    if (open) {
      reset({
        account_id: accounts?.[0]?.id ?? '',
        txn_date: todayIso(),
        type: 'expense',
        amount: '' as unknown as number,
        category_id: '',
        description: '',
      })
    }
  }, [open, accounts, reset])

  const selectedType = watch('type')
  const categoryOptions = (categories ?? []).filter((c) => c.kind === selectedType)

  const onSubmit = handleSubmit(async (raw) => {
    const values = schema.parse(raw)
    // Sign convention: expense = money out (negative), income = money in (positive).
    const signedAmount = values.type === 'expense' ? -values.amount : values.amount
    try {
      await createTransaction.mutateAsync({
        account_id: values.account_id,
        txn_date: values.txn_date,
        amount: signedAmount,
        type: values.type,
        category_id: values.category_id || null,
        description: values.description || null,
      })
      toast.success('Transaction added')
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error).message)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add transaction</DialogTitle>
          <DialogDescription>Record income or an expense against an account.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {/* Income / Expense segmented toggle */}
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
                      'rounded-lg border py-2 text-sm font-medium capitalize transition-colors',
                      field.value === t
                        ? t === 'expense'
                          ? 'border-expense bg-expense/10 text-expense'
                          : 'border-income bg-income/10 text-income'
                        : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="txn-amount">Amount</Label>
              <Input
                id="txn-amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                {...register('amount')}
              />
              {formState.errors.amount && (
                <p className="text-sm text-destructive">{formState.errors.amount.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="txn-date">Date</Label>
              <Input id="txn-date" type="date" {...register('txn_date')} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Account</Label>
            <Controller
              control={control}
              name="account_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {(accounts ?? []).map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {formState.errors.account_id && (
              <p className="text-sm text-destructive">{formState.errors.account_id.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Category</Label>
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Uncategorised" />
                  </SelectTrigger>
                  <SelectContent>
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="txn-desc">Description</Label>
            <Input id="txn-desc" placeholder="e.g. Woolworths" {...register('description')} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={formState.isSubmitting}>
              Add transaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
