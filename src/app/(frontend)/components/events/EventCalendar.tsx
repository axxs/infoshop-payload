'use client'

import { Event } from '@/payload-types'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface EventCalendarProps {
  events: Event[]
  currentMonth: number
  currentYear: number
}

/**
 * Get month name
 */
function getMonthName(month: number): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  return months[month]
}

/**
 * Get days in month
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Get first day of month (0 = Sunday, 6 = Saturday)
 */
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

/**
 * Format time for display
 */
function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function EventCalendar({ events, currentMonth, currentYear }: EventCalendarProps) {
  const router = useRouter()

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  // Group events by day
  const eventsByDay = new Map<number, Event[]>()
  events.forEach((event) => {
    const eventDate = new Date(event.startDate)
    if (eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear) {
      const day = eventDate.getDate()
      if (!eventsByDay.has(day)) {
        eventsByDay.set(day, [])
      }
      eventsByDay.get(day)?.push(event)
    }
  })

  // Navigation handlers
  const handlePrevMonth = () => {
    const newMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const newYear = currentMonth === 0 ? currentYear - 1 : currentYear
    router.push(`/events/calendar?month=${newMonth + 1}&year=${newYear}`)
  }

  const handleNextMonth = () => {
    const newMonth = currentMonth === 11 ? 0 : currentMonth + 1
    const newYear = currentMonth === 11 ? currentYear + 1 : currentYear
    router.push(`/events/calendar?month=${newMonth + 1}&year=${newYear}`)
  }

  const handleToday = () => {
    const now = new Date()
    router.push(`/events/calendar?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
  }

  // Create calendar grid
  const calendarDays = []
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i - firstDay + 1
    const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth
    const dayEvents = isValidDay ? eventsByDay.get(dayNumber) || [] : []

    // Check if this is today
    const now = new Date()
    const isToday =
      isValidDay &&
      dayNumber === now.getDate() &&
      currentMonth === now.getMonth() &&
      currentYear === now.getFullYear()

    calendarDays.push(
      <div
        key={i}
        className={`min-h-[120px] border p-2 ${
          isValidDay ? 'bg-background' : 'bg-muted/30'
        } ${isToday ? 'ring-2 ring-primary' : ''}`}
      >
        {isValidDay && (
          <>
            <div className="mb-2 flex items-center justify-between">
              <span
                className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {dayNumber}
              </span>
              {isToday && (
                <Badge variant="default" className="text-xs">
                  Today
                </Badge>
              )}
            </div>
            {dayEvents.length > 0 && (
              <div className="space-y-1">
                {dayEvents.map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`}>
                    <div className="group rounded-md bg-primary/10 px-2 py-1 text-xs transition-colors hover:bg-primary/20">
                      <p className="truncate font-medium">{formatTime(event.startDate)}</p>
                      <p className="truncate text-muted-foreground group-hover:text-foreground">
                        {event.title}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>,
    )
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button onClick={handlePrevMonth} variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-center">
              {getMonthName(currentMonth)} {currentYear}
            </CardTitle>
            <Button onClick={handleNextMonth} variant="outline" size="sm">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-center">
            <Button onClick={handleToday} variant="ghost" size="sm">
              Today
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="border-r p-2 text-center text-sm font-semibold last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => (
              <div key={index} className="border-r border-b last:border-r-0">
                {day}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Event count summary */}
      {events.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          {events.length} {events.length === 1 ? 'event' : 'events'} in {getMonthName(currentMonth)}
        </p>
      )}
    </div>
  )
}
