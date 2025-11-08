import { Suspense } from 'react'
import { getPayload } from 'payload'
import type { Where } from 'payload'
import config from '@payload-config'
import { EventGrid } from '../components/events/EventGrid'
import { EventFilters } from '../components/events/EventFilters'
import { sanitizeSearchInput } from '@/lib/utils'

interface EventsPageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    type?: string
    status?: string
  }>
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const payload = await getPayload({ config })
  const params = await searchParams

  const page = Number(params.page) || 1
  const limit = 12

  // Build query - only show upcoming and ongoing events by default
  const where: Where = {}

  // Filter by status
  const statusFilter = params.status || 'upcoming'
  if (statusFilter === 'upcoming') {
    where.status = { in: ['UPCOMING', 'ONGOING'] }
  } else if (statusFilter !== 'all') {
    where.status = { equals: statusFilter.toUpperCase() }
  }

  // Filter by event type
  const sanitizedSearch = sanitizeSearchInput(params.search)
  if (sanitizedSearch) {
    where.or = [
      { title: { contains: sanitizedSearch } },
      { description: { contains: sanitizedSearch } },
      { location: { contains: sanitizedSearch } },
    ]
  }

  // Filter by type
  if (params.type && params.type !== 'all') {
    where.eventType = { equals: params.type }
  }

  // Fetch events
  const { docs: events, totalDocs } = await payload.find({
    collection: 'events',
    where,
    limit,
    page,
    sort: 'startDate', // Soonest events first
    depth: 0,
  })

  const totalPages = Math.ceil(totalDocs / limit)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Upcoming Events</h1>
        <p className="mt-2 text-muted-foreground">
          Join us for book signings, readings, discussions, and more at Infoshop
        </p>
      </div>

      <div className="mb-6">
        <Suspense fallback={<div className="h-20 w-full animate-pulse rounded-md bg-muted" />}>
          <EventFilters totalEvents={totalDocs} />
        </Suspense>
      </div>

      <EventGrid events={events} />

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {page > 1 && (
            <a
              href={`/events?page=${page - 1}${params.search ? `&search=${encodeURIComponent(params.search)}` : ''}${params.type ? `&type=${params.type}` : ''}${params.status ? `&status=${params.status}` : ''}`}
              className="rounded-md border px-4 py-2 hover:bg-accent"
              aria-label="Go to previous page"
            >
              Previous
            </a>
          )}
          <span className="flex items-center px-4 py-2" aria-current="page">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/events?page=${page + 1}${params.search ? `&search=${encodeURIComponent(params.search)}` : ''}${params.type ? `&type=${params.type}` : ''}${params.status ? `&status=${params.status}` : ''}`}
              className="rounded-md border px-4 py-2 hover:bg-accent"
              aria-label="Go to next page"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  )
}
