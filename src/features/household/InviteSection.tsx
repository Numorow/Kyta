import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
})
type Values = z.infer<typeof schema>

function inviteLink(token: string) {
  return `${window.location.origin}/accept-invite?token=${token}`
}

function InviteRow({ invite }: { invite: { id: string; email: string; token: string; accepted_at: string | null; expires_at: string } }) {
  const expired = !invite.accepted_at && new Date(invite.expires_at).getTime() < Date.now()

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink(invite.token))
    toast.success('Invite link copied')
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{invite.email}</p>
        <p className="text-xs text-muted-foreground">
          {invite.accepted_at ? 'Accepted' : expired ? 'Expired' : 'Pending'}
        </p>
      </div>
      {!invite.accepted_at && !expired && (
        <Button variant="outline" size="sm" onClick={copyLink}>
          <Copy className="size-3.5" />
          Copy link
        </Button>
      )}
      {invite.accepted_at && <Check className="size-4 shrink-0 text-income" />}
    </div>
  )
}

export function InviteSection({ householdId }: { householdId: string }) {
  const queryClient = useQueryClient()
  const invitesQuery = useQuery({
    queryKey: ['household-invites', householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('household_invites')
        .select('id, email, token, accepted_at, expires_at')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const createInvite = useMutation({
    mutationFn: async ({ email }: Values) => {
      const { data, error } = await supabase
        .from('household_invites')
        .insert({ household_id: householdId, email })
        .select('id, email, token, accepted_at, expires_at')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: async (invite) => {
      await queryClient.invalidateQueries({ queryKey: ['household-invites', householdId] })
      reset()
      await navigator.clipboard.writeText(inviteLink(invite.token))
      toast.success('Invite created — link copied, send it to your partner')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite your partner</CardTitle>
        <CardDescription>
          Creates a shareable link — send it however you like (text, email, etc).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          onSubmit={handleSubmit((values) => createInvite.mutate(values))}
          className="flex items-start gap-2"
        >
          <div className="flex-1">
            <Label htmlFor="invite-email" className="sr-only">
              Partner's email
            </Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="partner@example.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting || createInvite.isPending}>
            Invite
          </Button>
        </form>

        {invitesQuery.data && invitesQuery.data.length > 0 && (
          <div className="flex flex-col gap-2">
            {invitesQuery.data.map((invite) => (
              <InviteRow key={invite.id} invite={invite} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
