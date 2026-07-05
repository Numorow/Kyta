import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
import { todayIso } from '@/lib/money'
import { useAddContribution, type Goal } from '@/features/goals/useGoals'

const schema = z.object({
  amount: z.coerce.number().refine((n) => n !== 0, 'Enter a non-zero amount'),
  contrib_date: z.string().min(1),
  note: z.string().trim().optional(),
})
type FormValues = z.input<typeof schema>

export function ContributionDialog({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: Goal
}) {
  const addContribution = useAddContribution()

  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: '' as unknown as number, contrib_date: todayIso(), note: '' },
  })

  useEffect(() => {
    if (open) reset({ amount: '' as unknown as number, contrib_date: todayIso(), note: '' })
  }, [open, reset])

  const onSubmit = handleSubmit(async (raw) => {
    const values = schema.parse(raw)
    try {
      await addContribution.mutateAsync({
        goal_id: goal.id,
        amount: values.amount,
        contrib_date: values.contrib_date,
        note: values.note || null,
      })
      toast.success('Contribution logged')
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error).message)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add to {goal.name}</DialogTitle>
          <DialogDescription>
            Enter a deposit, or a negative amount for a withdrawal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="contrib-amount">Amount</Label>
              <Input
                id="contrib-amount"
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
              <Label htmlFor="contrib-date">Date</Label>
              <Input id="contrib-date" type="date" {...register('contrib_date')} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="contrib-note">Note (optional)</Label>
            <Input id="contrib-note" placeholder="e.g. tax refund" {...register('note')} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={formState.isSubmitting}>
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
