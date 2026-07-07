import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/theme-toggle'
import { supabase } from '@/lib/supabase'
import { resetPasswordSchema, type ResetPasswordValues } from '@/features/auth/schemas'
import { useHousehold } from '@/features/household/HouseholdContext'
import { InviteSection } from '@/features/household/InviteSection'
import { MemberAvatar } from '@/features/household/MemberAvatar'
import { useMembers } from '@/features/household/useMembers'

function ProfileCard() {
  const { data: members } = useMembers()
  const queryClient = useQueryClient()
  const you = (members ?? []).find((m) => m.isYou)
  const youName = you?.name
  const [name, setName] = useState('')

  useEffect(() => {
    if (youName) setName(youName)
  }, [youName])

  const save = useMutation({
    mutationFn: async (newName: string) => {
      const { error } = await supabase.rpc('set_my_display_name', { p_name: newName })
      if (error) throw error
    },
    onSuccess: () => {
      // Refresh members everywhere attribution shows (grid, dashboard, reports).
      queryClient.invalidateQueries({ queryKey: ['members'] })
      toast.success('Name updated')
    },
    onError: (e) => toast.error((e as Error).message),
  })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Your name</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <MemberAvatar member={you} youAsYou={false} />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Kyle"
            aria-label="Your display name"
          />
          <Button
            variant="outline"
            disabled={!you || name.trim() === (you?.name ?? '') || save.isPending}
            onClick={() => save.mutate(name.trim())}
          >
            Save
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Shown on transactions, goals, and insights you add.
        </p>
      </CardContent>
    </Card>
  )
}

function MembersCard() {
  const { data: members } = useMembers()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Members</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {(members ?? []).map((m) => (
          <div key={m.userId} className="flex items-center justify-between gap-2 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <MemberAvatar member={m} />
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {m.name}
                  {m.isYou && <span className="font-normal text-muted-foreground"> (you)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
            </div>
            <Badge variant={m.role === 'owner' ? 'default' : 'secondary'} className="capitalize">
              {m.role}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function ChangePasswordCard() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) })

  // Works immediately for a signed-in user — no email round-trip, so it doesn't
  // depend on the Supabase redirect-URL config the recovery email needs.
  const onSubmit = async (values: ResetPasswordValues) => {
    const { error } = await supabase.auth.updateUser({ password: values.password })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Password changed')
    reset()
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Security</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-new-password">New password</Label>
            <Input
              id="settings-new-password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-confirm-password">Confirm password</Label>
            <Input
              id="settings-confirm-password"
              type="password"
              autoComplete="new-password"
              {...register('confirm')}
            />
            {errors.confirm && (
              <p className="text-sm text-destructive">{errors.confirm.message}</p>
            )}
          </div>
          <Button type="submit" variant="outline" className="self-start" disabled={isSubmitting}>
            Change password
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function SettingsPage() {
  const { household, membership } = useHousehold()
  const queryClient = useQueryClient()
  const [name, setName] = useState(household.name)

  useEffect(() => setName(household.name), [household.name])

  const rename = useMutation({
    mutationFn: async (newName: string) => {
      const { error } = await supabase
        .from('households')
        .update({ name: newName })
        .eq('id', household.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-household'] })
      toast.success('Household renamed')
    },
    onError: (e) => toast.error((e as Error).message),
  })

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Household */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Household</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="hh-name">Name</Label>
            <div className="flex gap-2">
              <Input id="hh-name" value={name} onChange={(e) => setName(e.target.value)} />
              <Button
                variant="outline"
                disabled={!name.trim() || name === household.name || rename.isPending}
                onClick={() => rename.mutate(name.trim())}
              >
                Save
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Base currency</span>
            <span>{household.base_currency} (locked for now)</span>
          </div>
        </CardContent>
      </Card>

      <ProfileCard />

      <MembersCard />

      {membership.role === 'owner' && <InviteSection householdId={membership.household_id} />}

      {/* Preferences */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex items-center justify-between py-1">
            <span className="text-sm">Theme</span>
            <ThemeToggle />
          </div>
          <Link
            to="/categories"
            className="flex items-center justify-between py-2 text-sm hover:text-foreground"
          >
            <span>Manage categories</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      <ChangePasswordCard />

      <Button variant="outline" onClick={() => supabase.auth.signOut()}>
        <LogOut className="size-4" />
        Sign out
      </Button>
    </div>
  )
}
