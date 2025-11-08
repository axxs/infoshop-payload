import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EventCalendar } from '../../components/events/EventCalendar'

interface CalendarPageProps {
  searchParams: Promise<{
    month?: string
    year?: string
  }>
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const payload = await getPayload({ config })
  const params = await searchParams

  // Get current month/year or use provided values
  const now = new Date()
  const currentYear = params.year ? parseInt(params.year) : now.getFullYear()
  const currentMonth = params.month ? parseInt(params.month) - 1 : now.getMonth()

  // Calculate date range for the month
  const startOfMonth = new Date(currentYear, currentMonth, 1)
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)

  // Fetch events for the month
  const { docs: events } = await payload.find({
    collection: 'events',
    where: {
      and: [
        {
          startDate: {
            greater_than_equal: startOfMonth.toISOString(),
          },
        },
        {
          startDate: {
            less_than_equal: endOfMonth.toISOString(),
          },
        },
        {
          status: {
            in: ['UPCOMING', 'ONGOING'],
          },
        },
      ],
    },
    limit: 100,
    sort: 'startDate',
    depth: 0,
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
        <h1 className="text-3xl font-bold">Event Calendar</h1>
        <p className="mt-2 text-muted-foreground">Browse events by month</p>
      </div>

      <EventCalendar events={events} currentMonth={currentMonth} currentYear={currentYear} />
    </div>
  )
}
