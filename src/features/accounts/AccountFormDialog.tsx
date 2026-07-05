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
import { todayIso } from '@/lib/money'
import {
  defaultModeForSubtype,
  SUBTYPES_BY_CLASS,
  SUBTYPE_LABELS,
  type AccountClass,
} from '@/features/accounts/constants'
import {
  useCreateAccount,
  useUpdateAccount,
  type Account,
} from '@/features/accounts/useAccounts'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter an account name'),
  class: z.enum(['asset', 'liability']),
  subtype: z.string().min(1),
  institution: z.string().trim().optional(),
  balance_mode: z.enum(['tracked', 'statement']),
  opening_balance: z.coerce.number(),
  opening_date: z.string().min(1),
  statement_balance: z.coerce.number(),
  include_in_net_worth: z.boolean(),
})
type FormValues = z.input<typeof schema>

function defaultValues(account?: Account): FormValues {
  // Liability balances are stored negative (debt); show them as a positive
  // "amount owing" in the form.
  const isLiability = account?.class === 'liability'
  const forDisplay = (v: number | null | undefined) =>
    v == null ? 0 : isLiability ? Math.abs(v) : v
  return {
    name: account?.name ?? '',
    class: (account?.class as AccountClass) ?? 'asset',
    subtype: account?.subtype ?? 'transaction',
    institution: account?.institution ?? '',
    balance_mode: (account?.balance_mode as 'tracked' | 'statement') ?? 'tracked',
    opening_balance: forDisplay(account?.opening_balance),
    opening_date: account?.opening_date ?? todayIso(),
    statement_balance: forDisplay(account?.statement_balance),
    include_in_net_worth: account?.include_in_net_worth ?? true,
  }
}

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: Account
}) {
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const isEdit = !!account

  const { register, handleSubmit, control, watch, setValue, reset, formState } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: defaultValues(account),
    })

  useEffect(() => {
    if (open) reset(defaultValues(account))
  }, [open, account, reset])

  const selectedClass = watch('class') as AccountClass
  const selectedMode = watch('balance_mode')
  const subtypeOptions = SUBTYPES_BY_CLASS[selectedClass]

  const onSubmit = handleSubmit(async (raw) => {
    const values = schema.parse(raw)
    // Liabilities are stored negative (debt) so net worth is a plain sum of
    // balances; the form collects a positive "amount owing".
    const sign = values.class === 'liability' ? -1 : 1
    const common = {
      name: values.name,
      class: values.class,
      subtype: values.subtype,
      institution: values.institution || null,
      balance_mode: values.balance_mode,
      include_in_net_worth: values.include_in_net_worth,
      // Only the fields relevant to the chosen mode carry meaning; store the
      // other as its neutral value so a later mode switch starts clean.
      opening_balance:
        values.balance_mode === 'tracked' ? sign * Math.abs(values.opening_balance) : 0,
      opening_date: values.opening_date,
      statement_balance:
        values.balance_mode === 'statement' ? sign * Math.abs(values.statement_balance) : null,
    }

    try {
      if (isEdit) {
        await updateAccount.mutateAsync({ id: account.id, patch: common })
        toast.success('Account updated')
      } else {
        await createAccount.mutateAsync(common)
        toast.success('Account added')
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
          <DialogTitle>{isEdit ? 'Edit account' : 'Add account'}</DialogTitle>
          <DialogDescription>
            {selectedMode === 'tracked'
              ? 'Tracked accounts compute their balance from transactions.'
              : 'Statement accounts hold a balance you update periodically.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="acct-name">Name</Label>
            <Input id="acct-name" placeholder="e.g. NAB Everyday" {...register('name')} />
            {formState.errors.name && (
              <p className="text-sm text-destructive">{formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Controller
                control={control}
                name="class"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      // Reset subtype to the first valid one for the new class.
                      const first = SUBTYPES_BY_CLASS[value as AccountClass][0]
                      setValue('subtype', first.value)
                      setValue('balance_mode', first.defaultMode)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="liability">Liability</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Category</Label>
              <Controller
                control={control}
                name="subtype"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      setValue('balance_mode', defaultModeForSubtype(value as never))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subtypeOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {SUBTYPE_LABELS[s.value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="acct-institution">Institution (optional)</Label>
            <Input id="acct-institution" placeholder="e.g. NAB" {...register('institution')} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Balance mode</Label>
            <Controller
              control={control}
              name="balance_mode"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tracked">Tracked (from transactions)</SelectItem>
                    <SelectItem value="statement">Statement (entered directly)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {selectedMode === 'tracked' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="acct-opening">
                  {selectedClass === 'liability' ? 'Opening amount owing' : 'Opening balance'}
                </Label>
                <Input
                  id="acct-opening"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  {...register('opening_balance')}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="acct-opening-date">As of</Label>
                <Input id="acct-opening-date" type="date" {...register('opening_date')} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="acct-statement">
                {selectedClass === 'liability' ? 'Amount owing' : 'Current balance'}
              </Label>
              <Input
                id="acct-statement"
                type="number"
                step="0.01"
                inputMode="decimal"
                {...register('statement_balance')}
              />
              <p className="text-xs text-muted-foreground">
                {selectedClass === 'liability'
                  ? 'Enter what you owe as a positive number.'
                  : 'The balance as it stands today.'}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="acct-nw">Include in net worth</Label>
              <p className="text-xs text-muted-foreground">Count this account toward equity.</p>
            </div>
            <Controller
              control={control}
              name="include_in_net_worth"
              render={({ field }) => (
                <Switch
                  id="acct-nw"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={formState.isSubmitting}>
              {isEdit ? 'Save changes' : 'Add account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
