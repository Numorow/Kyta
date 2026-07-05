import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { ArrowDown } from 'lucide-react'
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
import { todayIso } from '@/lib/money'
import { useAccounts } from '@/features/accounts/useAccounts'
import { useCreateTransfer } from '@/features/transactions/useTransactions'

const schema = z
  .object({
    from_account_id: z.string().min(1, 'Choose a source account'),
    to_account_id: z.string().min(1, 'Choose a destination account'),
    txn_date: z.string().min(1),
    amount: z.coerce.number().positive('Enter an amount greater than zero'),
    description: z.string().trim().optional(),
  })
  .refine((v) => v.from_account_id !== v.to_account_id, {
    message: 'Source and destination must differ',
    path: ['to_account_id'],
  })
type FormValues = z.input<typeof schema>

export function TransferFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: accounts } = useAccounts()
  const createTransfer = useCreateTransfer()

  const { register, handleSubmit, control, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      from_account_id: '',
      to_account_id: '',
      txn_date: todayIso(),
      amount: '' as unknown as number,
      description: '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        from_account_id: '',
        to_account_id: '',
        txn_date: todayIso(),
        amount: '' as unknown as number,
        description: '',
      })
    }
  }, [open, reset])

  const onSubmit = handleSubmit(async (raw) => {
    const values = schema.parse(raw)
    try {
      await createTransfer.mutateAsync({
        from_account_id: values.from_account_id,
        to_account_id: values.to_account_id,
        txn_date: values.txn_date,
        amount: values.amount,
        description: values.description || null,
      })
      toast.success('Transfer recorded')
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error).message)
    }
  })

  const accountSelect = (name: 'from_account_id' | 'to_account_id', placeholder: string) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select value={field.value} onValueChange={field.onChange}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
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
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add transfer</DialogTitle>
          <DialogDescription>
            Moves money between two accounts. Doesn't change your net worth.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>From</Label>
            {accountSelect('from_account_id', 'Source account')}
            {formState.errors.from_account_id && (
              <p className="text-sm text-destructive">
                {formState.errors.from_account_id.message}
              </p>
            )}
          </div>

          <div className="flex justify-center text-muted-foreground">
            <ArrowDown className="size-4" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>To</Label>
            {accountSelect('to_account_id', 'Destination account')}
            {formState.errors.to_account_id && (
              <p className="text-sm text-destructive">{formState.errors.to_account_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="transfer-amount">Amount</Label>
              <Input
                id="transfer-amount"
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
              <Label htmlFor="transfer-date">Date</Label>
              <Input id="transfer-date" type="date" {...register('txn_date')} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="transfer-desc">Description</Label>
            <Input
              id="transfer-desc"
              placeholder="e.g. Move to savings"
              {...register('description')}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={formState.isSubmitting}>
              Record transfer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
