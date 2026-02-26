import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { headers as getHeaders } from 'next/headers'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { ArrowLeft, Calendar, MapPin, Users, DollarSign } from 'lucide-react'
import { RegisterButton } from './RegisterButton'
import { getEventWithStats } from '@/lib/events'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const payload = await getPayload({ config })
  try {
    const event = await payload.findByID({ collection: 'events', id, depth: 0 })
    return {
      title: (event as { title?: string }).title || 'Event',
    }
  } catch {
    return { title: 'Event Not Found' }
  }
}

interface EventPageProps {
  params: Promise<{ id: string }>
}

/**
 * Format date for display
 */
function formatEventDate(startDate: string, endDate?: string | null): string {
  const start = new Date(startDate)
  const dateFormat: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }
  const timeFormat: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }

  const dateStr = start.toLocaleDateString('en-AU', dateFormat)
  const timeStr = start.toLocaleTimeString('en-AU', timeFormat)

  if (endDate) {
    const end = new Date(endDate)
    const endDateStr = end.toLocaleDateString('en-AU', dateFormat)
    const endTimeStr = end.toLocaleTimeString('en-AU', timeFormat)

    // Same day event
    if (dateStr === endDateStr) {
      return `${dateStr}, ${timeStr} - ${endTimeStr}`
    }

    // Multi-day event
    return `${dateStr} ${timeStr} - ${endDateStr} ${endTimeStr}`
  }

  return `${dateStr}, ${timeStr}`
}

/**
 * Get event type label
 */
function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    BOOK_SIGNING: 'Book Signing',
    READING: 'Reading',
    DISCUSSION: 'Discussion',
    WORKSHOP: 'Workshop',
    SCREENING: 'Screening',
    MEETING: 'Meeting',
    OTHER: 'Event',
  }
  return labels[type] || type
}

/**
 * Get status badge variant
 */
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
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

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params
  const payload = await getPayload({ config })
  const headersList = await getHeaders()

  // Get current user
  const { user } = await payload.auth({ headers: headersList as Headers })

  // Fetch event with stats
  const result = await getEventWithStats(Number(id))

  if (!result.success || !result.event) {
    notFound()
  }

  const event = result.event
  const stats = result.stats

  // Check if user is already registered
  let userRegistration = null
  if (user) {
    const registrations = await payload.find({
      collection: 'event-attendance',
      where: {
        event: { equals: event.id },
        user: { equals: user.id },
        status: { not_in: ['CANCELLED'] },
      },
      limit: 1,
    })
    userRegistration = registrations.docs[0] || null
  }

  const isCancelled = event.status === 'CANCELLED'
  const isCompleted = event.status === 'COMPLETED'
  const maxAttendees = event.maxAttendees ?? 0
  const currentAttendees = event.currentAttendees ?? 0
  const isFull = maxAttendees > 0 && currentAttendees >= maxAttendees
  const spotsLeft = maxAttendees > 0 ? maxAttendees - currentAttendees : null

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/events"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Events
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Event Details */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{getEventTypeLabel(event.eventType)}</Badge>
              <Badge variant={getStatusVariant(event.status)}>{event.status}</Badge>
            </div>
            <h1 className="mb-2 text-3xl font-bold">{event.title}</h1>
            <p className="text-lg text-muted-foreground">
              {formatEventDate(event.startDate, event.endDate)}
            </p>
          </div>

          {/* Event Description */}
          {event.description && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>About This Event</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Lexical rich text renderer needed for event description */}
                <div className="prose max-w-none">
                  <p className="text-muted-foreground">
                    Event description (Lexical rich text rendering to be implemented)
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">When</p>
                  <p className="text-sm text-muted-foreground">
                    {formatEventDate(event.startDate, event.endDate)}
                  </p>
                </div>
              </div>

              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Where</p>
                    <p className="text-sm text-muted-foreground">{event.location}</p>
                  </div>
                </div>
              )}

              {maxAttendees > 0 && (
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Capacity</p>
                    <p className="text-sm text-muted-foreground">
                      {currentAttendees} / {maxAttendees} registered
                      {spotsLeft !== null && spotsLeft > 0 && (
                        <span className="ml-1">({spotsLeft} spots remaining)</span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {event.price && event.price > 0 && (
                <div className="flex items-start gap-3">
                  <DollarSign className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Price</p>
                    <p className="text-sm text-muted-foreground">${event.price.toFixed(2)} AUD</p>
                  </div>
                </div>
              )}

              {(!event.price || event.price === 0) && (
                <div className="flex items-start gap-3">
                  <DollarSign className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Price</p>
                    <p className="text-sm font-medium text-green-600">Free Event</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Registration Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-8">
            <CardHeader>
              <CardTitle>Registration</CardTitle>
              <CardDescription>
                {isCancelled
                  ? 'This event has been cancelled'
                  : isCompleted
                    ? 'This event has ended'
                    : userRegistration
                      ? `You are ${userRegistration.status === 'WAITLIST' ? 'on the waitlist' : 'registered'}`
                      : isFull
                        ? 'Event is full - join waitlist'
                        : 'Register for this event'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats && (
                <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{stats.registered}</p>
                    <p className="text-xs text-muted-foreground">Registered</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{stats.waitlist}</p>
                    <p className="text-xs text-muted-foreground">Waitlist</p>
                  </div>
                </div>
              )}

              <RegisterButton
                eventId={event.id}
                userId={user?.id}
                userRegistration={userRegistration}
                isCancelled={isCancelled}
                isCompleted={isCompleted}
                isFull={isFull}
              />

              {!user && !isCancelled && !isCompleted && (
                <p className="text-center text-sm text-muted-foreground">
                  <Link href="/login" className="text-primary underline">
                    Sign in
                  </Link>{' '}
                  to register for this event
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
