import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

export function HomePage() {
  const { user } = useAuth()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background text-foreground">
      <ThemeToggle />
      <h1 className="text-2xl font-semibold">Household Finance</h1>
      <p className="text-muted-foreground">Signed in as {user?.email}</p>
      <p className="text-sm text-muted-foreground">
        Household creation/invite flow lands in Milestone 2.
      </p>
      <Button variant="outline" onClick={() => supabase.auth.signOut()}>
        Sign out
      </Button>
    </div>
  )
}
