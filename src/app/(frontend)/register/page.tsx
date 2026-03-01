import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/getCurrentUser'
import { sanitizeRedirect } from '@/lib/auth/sanitizeRedirect'
import { RegisterForm } from './RegisterForm'

export const metadata: Metadata = {
  title: 'Create Account',
}

interface RegisterPageProps {
  searchParams: Promise<{ redirect?: string }>
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const user = await getCurrentUser()
  const params = await searchParams
  const redirectTo = sanitizeRedirect(params.redirect)

  if (user) {
    redirect(redirectTo)
  }

  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <RegisterForm redirectTo={redirectTo} />
      </div>
    </div>
  )
}
