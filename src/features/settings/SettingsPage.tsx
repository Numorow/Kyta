import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/theme-toggle'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { useHousehold } from '@/features/household/HouseholdContext'
import { InviteSection } from '@/features/household/InviteSection'

function MembersCard({ householdId }: { householdId: string }) {
  const { user } = useAuth()
  const { data: members } = useQuery({
    queryKey: ['members', householdId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('household_members_detail', { hid: householdId })
      if (error) throw error
      return data
    },
  })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Members</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {(members ?? []).map((m) => (
          <div key={m.user_id} className="flex items-center justify-between text-sm">
            <span>
              {m.email}
              {m.user_id === user?.id && <span className="text-muted-foreground"> (you)</span>}
            </span>
            <Badge variant={m.role === 'owner' ? 'default' : 'secondary'} className="capitalize">
              {m.role}
            </Badge>
          </div>
        ))}
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

      <MembersCard householdId={membership.household_id} />

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

      <Button variant="outline" onClick={() => supabase.auth.signOut()}>
        <LogOut className="size-4" />
        Sign out
      </Button>
    </div>
  )
}
