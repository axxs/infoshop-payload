import Link from 'next/link'
import { Event } from '@/payload-types'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Calendar, MapPin, Users, Clock } from 'lucide-react'

interface EventCardProps {
  event: Event
}

/**
 * Format date for display
 */
function formatEventDate(startDate: string, endDate?: string | null): string {
  const start = new Date(startDate)
  const dateFormat: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
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
    const endTimeStr = end.toLocaleTimeString('en-AU', timeFormat)
    return `${dateStr} • ${timeStr} - ${endTimeStr}`
  }

  return `${dateStr} • ${timeStr}`
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

export function EventCard({ event }: EventCardProps) {
  const isCancelled = event.status === 'CANCELLED'
  const isCompleted = event.status === 'COMPLETED'
  const maxAttendees = event.maxAttendees ?? 0
  const currentAttendees = event.currentAttendees ?? 0
  const isFull = maxAttendees > 0 && currentAttendees >= maxAttendees
  const spotsLeft = maxAttendees > 0 ? maxAttendees - currentAttendees : null

  return (
    <Card className="card-hover-lift group flex h-full flex-col overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline">{getEventTypeLabel(event.eventType)}</Badge>
          <Badge variant={getStatusVariant(event.status)}>{event.status}</Badge>
        </div>
        <CardTitle className="mt-2 font-heading line-clamp-2">{event.title}</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <div className="flex items-start gap-2 text-sm">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">
            {formatEventDate(event.startDate, event.endDate)}
          </span>
        </div>

        {event.location && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">{event.location}</span>
          </div>
        )}

        {maxAttendees > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">
              {currentAttendees} / {maxAttendees} registered
              {spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 5 && (
                <span className="ml-1 font-medium text-orange-600">({spotsLeft} spots left)</span>
              )}
            </span>
          </div>
        )}

        {event.price && event.price > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">${event.price.toFixed(2)} AUD</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {isFull && !isCancelled && !isCompleted && (
          <Badge variant="destructive" className="w-full justify-center">
            Event Full - Join Waitlist
          </Badge>
        )}
        <Link href={`/events/${event.id}`} className="w-full">
          <Button
            variant={isCancelled || isCompleted ? 'outline' : 'default'}
            className="w-full"
            disabled={isCancelled}
          >
            {isCancelled
              ? 'Cancelled'
              : isCompleted
                ? 'View Details'
                : isFull
                  ? 'Join Waitlist'
                  : 'Register'}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
