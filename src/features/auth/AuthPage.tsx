import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  magicLinkSchema,
  passwordAuthSchema,
  type MagicLinkValues,
  type PasswordAuthValues,
} from '@/features/auth/schemas'
import { supabase } from '@/lib/supabase'

function PasswordAuthForm() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<PasswordAuthValues>({ resolver: zodResolver(passwordAuthSchema) })

  const onSubmit = async (values: PasswordAuthValues) => {
    const { error, data } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword(values)
        : await supabase.auth.signUp({
            ...values,
            options: { emailRedirectTo: window.location.origin },
          })

    if (error) {
      toast.error(error.message)
      return
    }
    if (mode === 'sign-up' && !data.session) {
      toast.success('Check your email to confirm your account.')
    }
  }

  // Send a recovery email that lands on /reset-password (must be an allow-listed
  // Redirect URL in Supabase Auth). Reuses the email the user already typed.
  const handleForgotPassword = async () => {
    const email = getValues('email')
    const parsed = magicLinkSchema.safeParse({ email })
    if (!parsed.success) {
      toast.error('Enter your email above first, then tap "Forgot password?".')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Check your email for a password reset link.')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>
      {mode === 'sign-in' && (
        <button
          type="button"
          onClick={handleForgotPassword}
          className="-mt-1 self-end text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Forgot password?
        </button>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {mode === 'sign-in' ? 'Sign in' : 'Create account'}
      </Button>
      <button
        type="button"
        onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        {mode === 'sign-in'
          ? "Don't have an account? Sign up"
          : 'Already have an account? Sign in'}
      </button>
    </form>
  )
}

function MagicLinkForm() {
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MagicLinkValues>({ resolver: zodResolver(magicLinkSchema) })

  const onSubmit = async (values: MagicLinkValues) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      toast.error(error.message)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        Check your email for a sign-in link.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="magic-email">Email</Label>
        <Input id="magic-email" type="email" autoComplete="email" {...register('email')} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        Send magic link
      </Button>
    </form>
  )
}

export function AuthPage() {
  const { session, loading } = useAuth()

  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Household Finance</CardTitle>
          <CardDescription>Sign in to your shared household.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="password">
            <TabsList className="w-full">
              <TabsTrigger value="password" className="flex-1">
                Password
              </TabsTrigger>
              <TabsTrigger value="magic-link" className="flex-1">
                Magic link
              </TabsTrigger>
            </TabsList>
            <TabsContent value="password" className="pt-4">
              <PasswordAuthForm />
            </TabsContent>
            <TabsContent value="magic-link" className="pt-4">
              <MagicLinkForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
