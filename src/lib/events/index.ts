/**
 * Event Registration Server Actions
 * Handles event registration, cancellation, check-in, and queries
 */

'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import type { Event, EventAttendance, User } from '@/payload-types'
import { revalidatePath } from 'next/cache'

export type AttendanceStatus = 'REGISTERED' | 'ATTENDED' | 'CANCELLED' | 'WAITLIST'

export interface RegisterForEventParams {
  eventId: number
  userId: number
}

export interface RegisterForEventResult {
  success: boolean
  error?: string
  attendance?: EventAttendance
  status?: AttendanceStatus
}

export interface CancelRegistrationParams {
  attendanceId: number
  reason?: string
  userId: number
}

export interface CancelRegistrationResult {
  success: boolean
  error?: string
  attendance?: EventAttendance
}

export interface CheckInAttendeeParams {
  attendanceId: number
  checkedInBy?: number
}

export interface CheckInAttendeeResult {
  success: boolean
  error?: string
  attendance?: EventAttendance
}

export interface GetUserRegistrationsParams {
  userId: number
  includeCancelled?: boolean
  upcomingOnly?: boolean
  limit?: number
  page?: number
}

export interface GetUserRegistrationsResult {
  success: boolean
  registrations: EventAttendance[]
  totalDocs: number
  totalPages: number
  error?: string
}

export interface GetEventAttendeesParams {
  eventId: number
  status?: AttendanceStatus
  limit?: number
  page?: number
}

export interface GetEventAttendeesResult {
  success: boolean
  attendees: EventAttendance[]
  totalDocs: number
  totalPages: number
  error?: string
}

/**
 * Register user for an event
 * Handles capacity checking and waitlist placement via collection hooks
 */
export async function registerForEvent(
  params: RegisterForEventParams,
): Promise<RegisterForEventResult> {
  const { eventId, userId } = params

  try {
    const payload = await getPayload({ config })

    // Verify event exists
    const event = await payload.findByID({
      collection: 'events',
      id: eventId,
    })

    if (!event) {
      return {
        success: false,
        error: 'Event not found',
      }
    }

    // Check if event is cancelled
    if (event.status === 'CANCELLED') {
      return {
        success: false,
        error: 'Cannot register for cancelled event',
      }
    }

    // Check if event is in the past
    if (event.status === 'COMPLETED') {
      return {
        success: false,
        error: 'Cannot register for completed event',
      }
    }

    // Verify user exists
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
    })

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      }
    }

    // Create attendance record
    // The hooks will handle:
    // - Duplicate prevention
    // - Capacity checking
    // - Status assignment (REGISTERED vs WAITLIST)
    // - Event currentAttendees update
    const attendance = await payload.create({
      collection: 'event-attendance',
      data: {
        event: eventId,
        user: userId,
        status: 'REGISTERED', // Hook may change this to WAITLIST
        registeredAt: new Date().toISOString(),
      },
    })

    // Revalidate event pages
    revalidatePath('/events')
    revalidatePath(`/events/${eventId}`)
    revalidatePath('/account/events')

    return {
      success: true,
      attendance,
      status: attendance.status as AttendanceStatus,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to register for event'
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Cancel event registration
 * Restores event capacity by updating currentAttendees (via hook)
 */
export async function cancelRegistration(
  params: CancelRegistrationParams,
): Promise<CancelRegistrationResult> {
  const { attendanceId, reason, userId } = params

  try {
    const payload = await getPayload({ config })

    // Fetch attendance record
    const attendance = await payload.findByID({
      collection: 'event-attendance',
      id: attendanceId,
      depth: 1,
    })

    if (!attendance) {
      return {
        success: false,
        error: 'Registration not found',
      }
    }

    // Verify user owns this registration
    const attendanceUserId =
      typeof attendance.user === 'object' ? attendance.user.id : attendance.user
    if (attendanceUserId !== userId) {
      return {
        success: false,
        error: 'Not authorised to cancel this registration',
      }
    }

    // Check if already cancelled
    if (attendance.status === 'CANCELLED') {
      return {
        success: false,
        error: 'Registration is already cancelled',
      }
    }

    const now = new Date().toISOString()

    // Update attendance to cancelled
    // Hook will update event's currentAttendees count
    const updatedAttendance = await payload.update({
      collection: 'event-attendance',
      id: attendanceId,
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        cancellationReason: reason,
      },
    })

    // Revalidate relevant pages
    const eventId = typeof attendance.event === 'object' ? attendance.event.id : attendance.event
    revalidatePath('/events')
    revalidatePath(`/events/${eventId}`)
    revalidatePath('/account/events')

    return {
      success: true,
      attendance: updatedAttendance,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel registration'
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Check in attendee (mark as attended)
 * Used on event day for attendance tracking
 */
export async function checkInAttendee(
  params: CheckInAttendeeParams,
): Promise<CheckInAttendeeResult> {
  const { attendanceId, checkedInBy } = params

  try {
    const payload = await getPayload({ config })

    // Fetch attendance record
    const attendance = await payload.findByID({
      collection: 'event-attendance',
      id: attendanceId,
    })

    if (!attendance) {
      return {
        success: false,
        error: 'Registration not found',
      }
    }

    // Check if registration is valid for check-in
    if (attendance.status === 'CANCELLED') {
      return {
        success: false,
        error: 'Cannot check in cancelled registration',
      }
    }

    if (attendance.status === 'WAITLIST') {
      return {
        success: false,
        error: 'Cannot check in waitlisted attendee',
      }
    }

    if (attendance.status === 'ATTENDED') {
      return {
        success: false,
        error: 'Attendee already checked in',
      }
    }

    const now = new Date().toISOString()

    // Update attendance to attended
    // Hook will set attendedAt timestamp
    const updatedAttendance = await payload.update({
      collection: 'event-attendance',
      id: attendanceId,
      data: {
        status: 'ATTENDED',
        attendedAt: now,
        notes: checkedInBy ? `Checked in by user ${checkedInBy} at ${now}` : `Checked in at ${now}`,
      },
    })

    return {
      success: true,
      attendance: updatedAttendance,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check in attendee'
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Get all event registrations for a user
 */
export async function getUserRegistrations(
  params: GetUserRegistrationsParams,
): Promise<GetUserRegistrationsResult> {
  const { userId, includeCancelled = false, upcomingOnly = false, limit = 10, page = 1 } = params

  try {
    const payload = await getPayload({ config })

    // Build query conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      user: { equals: userId },
    }

    // Exclude cancelled unless explicitly requested
    if (!includeCancelled) {
      where.status = { not_equals: 'CANCELLED' }
    }

    // Filter to upcoming events only if requested
    if (upcomingOnly) {
      where.event = {
        status: { in: ['UPCOMING', 'ONGOING'] },
      }
    }

    const { docs, totalDocs, totalPages } = await payload.find({
      collection: 'event-attendance',
      where,
      depth: 2, // Populate event details
      limit,
      page,
      sort: '-registeredAt', // Most recent first
    })

    return {
      success: true,
      registrations: docs,
      totalDocs,
      totalPages,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch registrations'
    return {
      success: false,
      registrations: [],
      totalDocs: 0,
      totalPages: 0,
      error: message,
    }
  }
}

/**
 * Get all attendees for an event
 */
export async function getEventAttendees(
  params: GetEventAttendeesParams,
): Promise<GetEventAttendeesResult> {
  const { eventId, status, limit = 50, page = 1 } = params

  try {
    const payload = await getPayload({ config })

    // Build query conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      event: { equals: eventId },
    }

    // Filter by status if provided
    if (status) {
      where.status = { equals: status }
    }

    const { docs, totalDocs, totalPages } = await payload.find({
      collection: 'event-attendance',
      where,
      depth: 2, // Populate user details
      limit,
      page,
      sort: 'registeredAt', // First registered first
    })

    return {
      success: true,
      attendees: docs,
      totalDocs,
      totalPages,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch attendees'
    return {
      success: false,
      attendees: [],
      totalDocs: 0,
      totalPages: 0,
      error: message,
    }
  }
}

/**
 * Get event by ID with attendee counts
 */
export async function getEventWithStats(eventId: number): Promise<{
  success: boolean
  event?: Event
  stats?: {
    registered: number
    attended: number
    waitlist: number
    cancelled: number
  }
  error?: string
}> {
  try {
    const payload = await getPayload({ config })

    const event = await payload.findByID({
      collection: 'events',
      id: eventId,
    })

    if (!event) {
      return {
        success: false,
        error: 'Event not found',
      }
    }

    // Get attendance counts by status
    const [registered, attended, waitlist, cancelled] = await Promise.all([
      payload.count({
        collection: 'event-attendance',
        where: {
          event: { equals: eventId },
          status: { equals: 'REGISTERED' },
        },
      }),
      payload.count({
        collection: 'event-attendance',
        where: {
          event: { equals: eventId },
          status: { equals: 'ATTENDED' },
        },
      }),
      payload.count({
        collection: 'event-attendance',
        where: {
          event: { equals: eventId },
          status: { equals: 'WAITLIST' },
        },
      }),
      payload.count({
        collection: 'event-attendance',
        where: {
          event: { equals: eventId },
          status: { equals: 'CANCELLED' },
        },
      }),
    ])

    return {
      success: true,
      event,
      stats: {
        registered: registered.totalDocs,
        attended: attended.totalDocs,
        waitlist: waitlist.totalDocs,
        cancelled: cancelled.totalDocs,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch event'
    return {
      success: false,
      error: message,
    }
  }
}
