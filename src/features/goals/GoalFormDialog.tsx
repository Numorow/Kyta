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
import { useAccounts } from '@/features/accounts/useAccounts'
import { useCreateGoal, useUpdateGoal, type Goal } from '@/features/goals/useGoals'

// Radix Select can't use an empty-string value, so a sentinel stands for "none".
const NO_ACCOUNT = '__none__'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a goal name'),
  target_amount: z.coerce.number().positive('Target must be greater than 0'),
  target_date: z.string().optional(),
  linked_account_id: z.string().optional(),
})
type FormValues = z.input<typeof schema>

function defaultValues(goal?: Goal): FormValues {
  return {
    name: goal?.name ?? '',
    target_amount: (goal?.target_amount ?? '') as unknown as number,
    target_date: goal?.target_date ?? '',
    linked_account_id: goal?.linked_account_id ?? NO_ACCOUNT,
  }
}

export function GoalFormDialog({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: Goal
}) {
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const { data: accounts } = useAccounts()
  const isEdit = !!goal

  const { register, handleSubmit, control, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(goal),
  })

  useEffect(() => {
    if (open) reset(defaultValues(goal))
  }, [open, goal, reset])

  const onSubmit = handleSubmit(async (raw) => {
    const values = schema.parse(raw)
    const payload = {
      name: values.name,
      target_amount: values.target_amount,
      target_date: values.target_date ? values.target_date : null,
      linked_account_id:
        values.linked_account_id && values.linked_account_id !== NO_ACCOUNT
          ? values.linked_account_id
          : null,
    }
    try {
      if (isEdit) {
        await updateGoal.mutateAsync({ id: goal.id, patch: payload })
        toast.success('Goal updated')
      } else {
        await createGoal.mutateAsync(payload)
        toast.success('Goal added')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error).message)
    }
  })

  // Only asset accounts make sense as a savings source for the hint.
  const assetAccounts = (accounts ?? []).filter((a) => a.class === 'asset')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit goal' : 'New goal'}</DialogTitle>
          <DialogDescription>
            Track progress from contributions you log. Linking an account just
            shows its balance as a hint.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-name">Name</Label>
            <Input id="goal-name" placeholder="e.g. House deposit" {...register('name')} />
            {formState.errors.name && (
              <p className="text-sm text-destructive">{formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-target">Target amount</Label>
              <Input
                id="goal-target"
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                {...register('target_amount')}
              />
              {formState.errors.target_amount && (
                <p className="text-sm text-destructive">
                  {formState.errors.target_amount.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-date">Target date (optional)</Label>
              <Input id="goal-date" type="date" {...register('target_date')} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Linked account (optional)</Label>
            <Controller
              control={control}
              name="linked_account_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ACCOUNT}>None</SelectItem>
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

          <DialogFooter>
            <Button type="submit" disabled={formState.isSubmitting}>
              {isEdit ? 'Save changes' : 'Add goal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
