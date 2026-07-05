import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/app/AppLayout'
import { AuthPage } from '@/features/auth/AuthPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { AcceptInvitePage } from '@/features/household/AcceptInvitePage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { AccountsPage } from '@/features/accounts/AccountsPage'
import { TransactionsPage } from '@/features/transactions/TransactionsPage'

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
        ],
      },
    ],
  },
])
