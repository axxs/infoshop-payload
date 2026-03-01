import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Package, Calendar } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/getCurrentUser'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { LogoutButton } from './LogoutButton'
import type { User } from '@/payload-types'

export const metadata: Metadata = {
  title: 'My Account',
}

export default async function AccountPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=/account')
  }

  const typedUser = user as User
  const name = typedUser.name || typedUser.email || 'there'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome, {name}</h1>
        <p className="mt-2 text-muted-foreground">Manage your account and view your activity</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/account/orders">
          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View your order history and track purchases</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/account/events">
          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View your event registrations and upcoming events
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="mt-8">
        <LogoutButton />
      </div>
    </div>
  )
}
