import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/getCurrentUser'
import { sanitizeRedirect } from '@/lib/auth/sanitizeRedirect'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = {
  title: 'Login',
}

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser()
  const params = await searchParams
  const redirectTo = sanitizeRedirect(params.redirect)

  if (user) {
    redirect(redirectTo)
  }

  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <LoginForm redirectTo={redirectTo} />
      </div>
    </div>
  )
}
