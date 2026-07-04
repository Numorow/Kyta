import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useInvalidateMyHousehold } from '@/features/household/useHousehold'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a household name'),
})
type Values = z.infer<typeof schema>

export function CreateHouseholdPage() {
  const invalidateHousehold = useInvalidateMyHousehold()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '' } })

  const onSubmit = async ({ name }: Values) => {
    setSubmitting(true)
    const { error } = await supabase.rpc('create_household', { household_name: name })
    setSubmitting(false)
    if (error) {
      toast.error(error.message)
      return
    }
    invalidateHousehold()
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create your household</CardTitle>
          <CardDescription>
            You'll invite your partner to join once it's set up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Household name</Label>
              <Input id="name" placeholder="e.g. The Baileys" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <Button type="submit" disabled={submitting}>
              Create household
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
