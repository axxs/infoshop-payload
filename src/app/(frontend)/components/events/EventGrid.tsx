import { Event } from '@/payload-types'
import { EventCard } from './EventCard'

interface EventGridProps {
  events: Event[]
}

export function EventGrid({ events }: EventGridProps) {
  if (events.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No events found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting your search or filters, or check back later for upcoming events
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}
