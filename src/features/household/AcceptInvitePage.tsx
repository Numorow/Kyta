import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/AuthProvider'
import { useInvalidateMyHousehold } from '@/features/household/useHousehold'
import { supabase } from '@/lib/supabase'
import { setPendingInvite } from '@/lib/pending-invite'

export function AcceptInvitePage() {
  const { session, loading } = useAuth()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const invalidateHousehold = useInvalidateMyHousehold()
  const [status, setStatus] = useState<'pending' | 'done' | 'error'>('pending')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (loading || !session || !token || status !== 'pending') return

    supabase.functions
      .invoke('accept-invite', { body: { token } })
      .then(({ error }) => {
        if (error) {
          setErrorMessage(error.message)
          setStatus('error')
          return
        }
        invalidateHousehold()
        setStatus('done')
      })
  }, [loading, session, token, status, invalidateHousehold])

  if (!token) return <Navigate to="/" replace />
  if (loading) return null
  if (!session) {
    setPendingInvite(token)
    return <Navigate to="/login" replace />
  }
  if (status === 'done') return <Navigate to="/" replace />

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Joining household</CardTitle>
          <CardDescription>
            {status === 'pending' ? 'Redeeming your invite…' : "Couldn't accept this invite"}
          </CardDescription>
        </CardHeader>
        {status === 'error' && (
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-destructive">{errorMessage}</p>
            <Button variant="outline" onClick={() => setStatus('pending')}>
              Try again
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
