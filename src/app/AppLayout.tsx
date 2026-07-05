import { NavLink, Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { NAV_ITEMS } from '@/app/nav'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { HouseholdGate, useHousehold } from '@/features/household/HouseholdContext'

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              'max-md:flex-col max-md:gap-1 max-md:px-2 max-md:text-xs',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
            )
          }
        >
          <Icon className="size-5 shrink-0" />
          {label}
        </NavLink>
      ))}
    </>
  )
}

function Chrome() {
  const { household } = useHousehold()

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <div className="mb-6 px-2">
          <p className="text-lg font-semibold text-sidebar-foreground">{household.name}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          <NavItems />
        </nav>
        <div className="flex items-center justify-between border-t pt-4">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => supabase.auth.signOut()}
            className="text-muted-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b bg-sidebar px-4 py-3 md:hidden">
        <p className="font-semibold text-sidebar-foreground">{household.name}</p>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom tab nav */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex items-stretch justify-around border-t bg-sidebar md:hidden">
        <NavItems />
      </nav>
    </div>
  )
}

export function AppLayout() {
  return (
    <HouseholdGate>
      <Chrome />
    </HouseholdGate>
  )
}
