import { useRef } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { consumePendingInvite } from '@/lib/pending-invite'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  // consumePendingInvite() deletes from sessionStorage as it reads, so it must
  // only ever run once per mount — a ref survives StrictMode's double-render
  // (which reuses the same fiber's hooks), unlike a plain call in the render body.
  const pendingTokenRef = useRef<string | null | undefined>(undefined)
  if (pendingTokenRef.current === undefined) {
    pendingTokenRef.current = consumePendingInvite()
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (pendingTokenRef.current) {
    return <Navigate to={`/accept-invite?token=${pendingTokenRef.current}`} replace />
  }

  return <Outlet />
}
