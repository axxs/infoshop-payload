'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useState, useTransition } from 'react'

interface EventFiltersProps {
  totalEvents: number
}

export function EventFilters({ totalEvents }: EventFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '')
  const currentType = searchParams.get('type') || 'all'
  const currentStatus = searchParams.get('status') || 'upcoming'

  const handleSearch = (value: string) => {
    setSearchValue(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    params.delete('page') // Reset to page 1
    startTransition(() => {
      router.push(`/events?${params.toString()}`)
    })
  }

  const handleTypeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('type')
    } else {
      params.set('type', value)
    }
    params.delete('page') // Reset to page 1
    startTransition(() => {
      router.push(`/events?${params.toString()}`)
    })
  }

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'upcoming') {
      params.delete('status')
    } else {
      params.set('status', value)
    }
    params.delete('page') // Reset to page 1
    startTransition(() => {
      router.push(`/events?${params.toString()}`)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search events..."
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
            disabled={isPending}
          />
        </div>

        <div className="flex gap-2">
          <Select value={currentType} onValueChange={handleTypeChange} disabled={isPending}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="BOOK_SIGNING">Book Signing</SelectItem>
              <SelectItem value="READING">Reading</SelectItem>
              <SelectItem value="DISCUSSION">Discussion</SelectItem>
              <SelectItem value="WORKSHOP">Workshop</SelectItem>
              <SelectItem value="SCREENING">Screening</SelectItem>
              <SelectItem value="MEETING">Meeting</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={currentStatus} onValueChange={handleStatusChange} disabled={isPending}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="ONGOING">Ongoing</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {totalEvents} {totalEvents === 1 ? 'event' : 'events'} found
      </p>
    </div>
  )
}
