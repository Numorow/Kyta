import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/app/AppLayout'
import { AuthPage } from '@/features/auth/AuthPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { AcceptInvitePage } from '@/features/household/AcceptInvitePage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { AccountsPage } from '@/features/accounts/AccountsPage'
import { TransactionsPage } from '@/features/transactions/TransactionsPage'
import { ImportPage } from '@/features/import/ImportPage'
import { BudgetsPage } from '@/features/budgets/BudgetsPage'
import { CategoriesPage } from '@/features/categories/CategoriesPage'
import { RecurringPage } from '@/features/recurring/RecurringPage'
import { NetWorthPage } from '@/features/networth/NetWorthPage'

export const router = createBrowserRouter([
  { path: '/login', element: <AuthPage /> },
  { path: '/accept-invite', element: <AcceptInvitePage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/accounts', element: <AccountsPage /> },
          { path: '/transactions', element: <TransactionsPage /> },
          { path: '/import', element: <ImportPage /> },
          { path: '/budgets', element: <BudgetsPage /> },
          { path: '/categories', element: <CategoriesPage /> },
          { path: '/bills', element: <RecurringPage /> },
          { path: '/net-worth', element: <NetWorthPage /> },
        ],
      },
    ],
  },
])
