'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { registerUser } from '@/lib/auth/actions'

interface RegisterFormProps {
  redirectTo: string
}

export function RegisterForm({ redirectTo }: RegisterFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientError, setClientError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setClientError(null)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password')?.toString() ?? ''
    const confirmPassword = formData.get('confirmPassword')?.toString() ?? ''

    // Client-side validation
    if (password.length < 8) {
      setClientError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setClientError('Passwords do not match')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await registerUser(formData)
      if (result.success) {
        router.push(redirectTo)
        router.refresh()
      } else {
        setError(result.error ?? 'Registration failed. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayError = clientError || error

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Sign up for an Infoshop account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="register-name" className="mb-2 block text-sm font-medium">
              Name
            </label>
            <Input
              id="register-name"
              name="name"
              type="text"
              required
              maxLength={200}
              autoComplete="name"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="register-email" className="mb-2 block text-sm font-medium">
              Email
            </label>
            <Input
              id="register-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="mb-2 block text-sm font-medium">
              Password
            </label>
            <Input
              id="register-password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="mb-2 block text-sm font-medium">
              Confirm Password
            </label>
            <Input
              id="register-confirm-password"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Repeat your password"
            />
          </div>

          {displayError && (
            <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {displayError}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href={`/login${redirectTo !== '/account' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
