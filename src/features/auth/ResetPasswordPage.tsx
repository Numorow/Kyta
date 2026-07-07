import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/AuthProvider'
import { resetPasswordSchema, type ResetPasswordValues } from '@/features/auth/schemas'
import { supabase } from '@/lib/supabase'

/**
 * Landing page for the password-recovery email link. The Supabase client
 * (detectSessionInUrl is on by default) parses the recovery token from the URL
 * on load and establishes a session, so once auth settles a valid link yields a
 * session and we can let the user set a new password via updateUser. Also works
 * for an already-signed-in user (acts as a change-password). Public route so the
 * link renders before a normal session exists.
 */
export function ResetPasswordPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [urlError, setUrlError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) })

  useEffect(() => {
    // Supabase reports an expired/invalid link via the URL hash.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const err = hash.get('error_description') ?? hash.get('error')
    if (err) setUrlError(err.replace(/\+/g, ' '))
  }, [])

  const onSubmit = async (values: ResetPasswordValues) => {
    const { error } = await supabase.auth.updateUser({ password: values.password })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Password updated — you are signed in.')
    navigate('/', { replace: true })
  }

  const invalid = !!urlError || (!loading && !session)

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>
            {loading
              ? 'Verifying your reset link…'
              : session
                ? 'Choose a new password for your account.'
                : 'This reset link is invalid or has expired.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : invalid ? (
            <div className="flex flex-col gap-3 text-sm">
              {urlError && <p className="text-destructive">{urlError}</p>}
              <p className="text-muted-foreground">
                Request a fresh link from the sign-in screen.
              </p>
              <Button asChild variant="outline">
                <Link to="/login">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  {...register('confirm')}
                />
                {errors.confirm && (
                  <p className="text-sm text-destructive">{errors.confirm.message}</p>
                )}
              </div>
              <Button type="submit" disabled={isSubmitting}>
                Update password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
