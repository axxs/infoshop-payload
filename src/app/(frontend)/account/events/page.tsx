import { redirect } from 'next/navigation'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import { ArrowLeft, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { getUserRegistrations } from '@/lib/events'

/**
 * Get status badge variant based on attendance status
 */
function getAttendanceStatusVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'REGISTERED':
      return 'default'
    case 'ATTENDED':
      return 'secondary'
    case 'WAITLIST':
      return 'outline'
    case 'CANCELLED':
      return 'destructive'
    default:
      return 'outline'
  }
}

/**
 * Get event status badge variant
 */
function getEventStatusVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'UPCOMING':
      return 'default'
    case 'ONGOING':
      return 'secondary'
    case 'COMPLETED':
      return 'outline'
    case 'CANCELLED':
      return 'destructive'
    default:
      return 'outline'
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateString))
}

export default async function MyEventsPage() {
  const payload = await getPayload({ config })
  const headersList = await getHeaders()

  // Get current user from Payload auth
  const { user } = await payload.auth({ headers: headersList as Headers })

  if (!user) {
    redirect('/login?redirect=/account/events')
  }

  // Fetch user registrations
  const registrationsResult = await getUserRegistrations({
    userId: user.id,
    includeCancelled: true,
    upcomingOnly: false,
    limit: 50,
    page: 1,
  })

  const registrations = registrationsResult.registrations || []

  // Separate into upcoming and past
  const now = new Date()
  const upcomingRegistrations = registrations.filter((reg) => {
    if (typeof reg.event === 'object' && reg.event.startDate) {
      return new Date(reg.event.startDate) >= now
    }
    return false
  })

  const pastRegistrations = registrations.filter((reg) => {
    if (typeof reg.event === 'object' && reg.event.startDate) {
      return new Date(reg.event.startDate) < now
    }
    return false
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/events"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Events
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Events</h1>
        <p className="mt-2 text-muted-foreground">
          View and manage your event registrations at Infoshop
        </p>
      </div>

      {registrations.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[400px] flex-col items-center justify-center">
            <Calendar className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-xl font-semibold">No events yet</h3>
            <p className="mb-6 text-center text-muted-foreground">
              You haven&apos;t registered for any events yet. Check out our upcoming events!
            </p>
            <Link href="/events">
              <Button>Browse Events</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Upcoming Events */}
          {upcomingRegistrations.length > 0 && (
            <div>
              <h2 className="mb-4 text-2xl font-semibold">Upcoming Events</h2>
              <div className="space-y-4">
                {upcomingRegistrations.map((registration) => {
                  const event = typeof registration.event === 'object' ? registration.event : null
                  if (!event) return null

                  return (
                    <Link key={registration.id} href={`/events/${event.id}`}>
                      <Card className="transition-shadow hover:shadow-lg">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <Badge variant={getAttendanceStatusVariant(registration.status)}>
                                  {registration.status}
                                </Badge>
                                <Badge variant={getEventStatusVariant(event.status)}>
                                  {event.status}
                                </Badge>
                              </div>
                              <CardTitle className="mb-1">{event.title}</CardTitle>
                              <CardDescription>{formatDate(event.startDate)}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1 text-sm text-muted-foreground">
                              {event.location && <p>📍 {event.location}</p>}
                              <p>
                                Registered:{' '}
                                {new Date(registration.registeredAt).toLocaleDateString('en-AU')}
                              </p>
                            </div>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Past Events */}
          {pastRegistrations.length > 0 && (
            <div>
              <h2 className="mb-4 text-2xl font-semibold">Past Events</h2>
              <div className="space-y-4">
                {pastRegistrations.map((registration) => {
                  const event = typeof registration.event === 'object' ? registration.event : null
                  if (!event) return null

                  return (
                    <Link key={registration.id} href={`/events/${event.id}`}>
                      <Card className="opacity-75 transition-all hover:opacity-100 hover:shadow-lg">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <Badge variant={getAttendanceStatusVariant(registration.status)}>
                                  {registration.status}
                                </Badge>
                                <Badge variant={getEventStatusVariant(event.status)}>
                                  {event.status}
                                </Badge>
                              </div>
                              <CardTitle className="mb-1">{event.title}</CardTitle>
                              <CardDescription>{formatDate(event.startDate)}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1 text-sm text-muted-foreground">
                              {event.location && <p>📍 {event.location}</p>}
                              {registration.attendedAt && (
                                <p className="font-medium text-green-600">✓ Attended</p>
                              )}
                            </div>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
