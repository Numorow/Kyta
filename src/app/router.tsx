import { createBrowserRouter } from 'react-router-dom'
import { AuthPage } from '@/features/auth/AuthPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { HomePage } from '@/features/home/HomePage'
import { AcceptInvitePage } from '@/features/household/AcceptInvitePage'

export const router = createBrowserRouter([
  { path: '/login', element: <AuthPage /> },
  { path: '/accept-invite', element: <AcceptInvitePage /> },
  {
    element: <ProtectedRoute />,
    children: [{ path: '/', element: <HomePage /> }],
  },
])
