import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  PiggyBank,
  CalendarClock,
  TrendingUp,
  BarChart3,
  Receipt,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
}

// Extended as later milestones land (Net worth, Reports).
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/income', label: 'Income', icon: Receipt },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/bills', label: 'Bills', icon: CalendarClock },
  { to: '/net-worth', label: 'Net worth', icon: TrendingUp },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
]
