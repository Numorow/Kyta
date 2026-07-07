import { NavLink, Outlet } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { NAV_ITEMS, type NavItem } from '@/app/nav'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'
import { HouseholdGate, useHousehold } from '@/features/household/HouseholdContext'
import { useRealtimeSync } from '@/features/realtime/useRealtimeSync'

const SETTINGS_ITEM: NavItem = { to: '/settings', label: 'Settings', icon: Settings }

// Bottom-bar picks on mobile (Accounts + Reports stay reachable via dashboard
// cards, so the bar doesn't get too crowded on a phone).
const MOBILE_NAV: NavItem[] = [
  ...NAV_ITEMS.filter((i) => ['/', '/transactions', '/budgets', '/bills'].includes(i.to)),
  SETTINGS_ITEM,
]

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    'max-md:flex-col max-md:gap-1 max-md:px-2 max-md:py-2 max-md:text-[11px]',
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
      : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
  )
}

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <NavLink to={item.to} end={item.to === '/'} onClick={onNavigate} className={navLinkClass}>
      <Icon className="size-5 shrink-0" />
      {item.label}
    </NavLink>
  )
}

function Chrome() {
  const { household } = useHousehold()
  useRealtimeSync()

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <div className="mb-6 px-2">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">2Up</p>
          <p className="text-lg font-semibold text-sidebar-foreground">{household.name}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavRow key={item.to} item={item} />
          ))}
        </nav>
        <div className="flex flex-col gap-1 border-t pt-2">
          <NavRow item={SETTINGS_ITEM} />
          <div className="px-2 pt-1">
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b bg-sidebar px-4 py-3 md:hidden">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">2Up</span>
          <p className="font-semibold text-sidebar-foreground">{household.name}</p>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 overflow-x-hidden pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom tab nav */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex items-stretch justify-around border-t bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden">
        {MOBILE_NAV.map((item) => (
          <NavRow key={item.to} item={item} />
        ))}
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
