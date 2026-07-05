import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  PiggyBank,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
}

// Extended as later milestones land (Bills, Net worth, Reports).
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
]
