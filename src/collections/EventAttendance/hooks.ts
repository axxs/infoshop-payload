/**
 * EventAttendance Collection Hooks
 * Handles capacity management, duplicate prevention, and attendee count updates
 */

import type {
  CollectionBeforeChangeHook,
  CollectionAfterChangeHook,
  CollectionBeforeValidateHook,
} from 'payload'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getRelationshipId } from '@/lib/utils/relationships'

/**
 * Prevent Duplicate Registration
 * Ensures a user cannot register for the same event multiple times
 * Only applies to active registrations (not cancelled)
 *
 * @param data - EventAttendance data to validate
 * @param operation - Type of operation (create/update)
 * @throws Error if user already registered for this event
 */
export const preventDuplicateRegistration: CollectionBeforeValidateHook = async ({
  data,
  operation,
  originalDoc,
}) => {
  if (!data) return

  // Only check on create, or if event/user changed
  if (operation !== 'create') {
    const eventChanged = data.event && data.event !== originalDoc?.event
    const userChanged = data.user && data.user !== originalDoc?.user
    if (!eventChanged && !userChanged) {
      return
    }
  }

  if (!data.event || !data.user) {
    return
  }

  const payload = await getPayload({ config })

  const eventId = getRelationshipId(data.event, 'events')
  const userId = getRelationshipId(data.user, 'users')

  // Check for existing registration (excluding current doc if updating)
  const whereClause = {
    event: { equals: eventId },
    user: { equals: userId },
    status: { not_in: ['CANCELLED'] }, // Ignore cancelled registrations
  } as const

  // Build complete where clause
  const where =
    operation === 'update' && originalDoc?.id
      ? {
          ...whereClause,
          id: { not_equals: originalDoc.id },
        }
      : whereClause

  const existingRegistration = await payload.find({
    collection: 'event-attendance',
    where,
    limit: 1,
  })

  if (existingRegistration.docs.length > 0) {
    throw new Error('User is already registered for this event')
  }
}

/**
 * Validate Capacity and Set Status
 * Checks event capacity and sets status to WAITLIST if event is full
 * Status logic:
 * - No capacity limit (maxAttendees = 0): Always REGISTERED
 * - Within capacity: REGISTERED
 * - At/over capacity: WAITLIST
 *
 * @param data - EventAttendance data to validate
 * @param operation - Type of operation
 * @returns Updated data with appropriate status
 */
export const validateCapacityAndSetStatus: CollectionBeforeValidateHook = async ({
  data,
  operation,
}) => {
  if (!data || !data.event) return

  // Only check on create or when status is being set to REGISTERED
  if (operation === 'update' && data.status !== 'REGISTERED') {
    return
  }

  const payload = await getPayload({ config })

  const eventId = getRelationshipId(data.event, 'events')

  // Fetch event to check capacity
  const event = await payload.findByID({
    collection: 'events',
    id: eventId,
  })

  // Skip if event has no capacity limit
  const maxAttendees = event.maxAttendees ?? 0
  if (maxAttendees === 0) {
    // No limit - ensure status is REGISTERED (unless explicitly cancelled)
    if (data.status !== 'CANCELLED') {
      data.status = 'REGISTERED'
    }
    return
  }

  // Count current registered attendees (excluding cancelled and waitlist)
  const currentAttendeesResult = await payload.count({
    collection: 'event-attendance',
    where: {
      event: { equals: eventId },
      status: { equals: 'REGISTERED' },
    },
  })

  const currentAttendees = currentAttendeesResult.totalDocs

  // Check if event is at capacity
  if (currentAttendees >= maxAttendees) {
    // Event is full - set to waitlist
    data.status = 'WAITLIST'
    payload.logger.info(
      `Event "${event.title}" is at capacity (${currentAttendees}/${maxAttendees}). User added to waitlist.`,
    )
  } else {
    // Space available - ensure registered (unless explicitly cancelled)
    if (data.status !== 'CANCELLED') {
      data.status = 'REGISTERED'
    }
  }
}

/**
 * Set Timestamps
 * Automatically sets timestamp fields based on status changes
 * - registeredAt: Set on create
 * - attendedAt: Set when status changes to ATTENDED
 * - cancelledAt: Set when status changes to CANCELLED
 *
 * @param data - EventAttendance data being created/updated
 * @param operation - Type of operation
 * @param originalDoc - Original document (for updates)
 * @returns Updated data with appropriate timestamps
 */
export const setTimestamps: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
}) => {
  if (!data) return data

  const now = new Date().toISOString()

  // Set registeredAt on create
  if (operation === 'create') {
    data.registeredAt = now
  }

  // Set attendedAt when status changes to ATTENDED
  if (data.status === 'ATTENDED' && originalDoc?.status !== 'ATTENDED') {
    data.attendedAt = now
  }

  // Set cancelledAt when status changes to CANCELLED
  if (data.status === 'CANCELLED' && originalDoc?.status !== 'CANCELLED') {
    data.cancelledAt = now
  }

  return data
}

/**
 * Update Event Attendee Count
 * Recalculates and updates the event's currentAttendees field
 * Only counts REGISTERED attendees (not waitlist or cancelled)
 *
 * Note: This runs after each attendance record change to keep count synchronized.
 * For high-traffic events, consider implementing a denormalized counter with
 * periodic reconciliation instead.
 *
 * @param doc - Created/updated EventAttendance document
 * @param req - Payload request object
 * @returns EventAttendance document (unchanged)
 */
export const updateEventAttendeeCount: CollectionAfterChangeHook = async ({ doc, req }) => {
  if (!doc.event) {
    return doc
  }

  const payload = await getPayload({ config })

  const eventId = getRelationshipId(doc.event, 'events')

  try {
    // Count registered attendees for this event
    const registeredCountResult = await payload.count({
      collection: 'event-attendance',
      where: {
        event: { equals: eventId },
        status: { equals: 'REGISTERED' },
      },
    })

    const registeredCount = registeredCountResult.totalDocs

    // Update event's currentAttendees field
    await payload.update({
      collection: 'events',
      id: eventId,
      data: {
        currentAttendees: registeredCount,
      },
    })

    req.payload.logger.info(`Updated event ${eventId} attendee count: ${registeredCount}`)
  } catch (error) {
    req.payload.logger.error(
      `Failed to update attendee count for event ${eventId}: ${error instanceof Error ? error.message : String(error)}`,
    )
    // Don't throw - allow registration to complete even if count update fails
  }

  return doc
}
