/**
 * Event Registration Integration Tests
 *
 * Tests the event registration system including:
 * - User registration for events
 * - Capacity management and waitlist
 * - Registration cancellation
 * - Check-in functionality
 * - Duplicate prevention
 * - Event attendee count updates
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Event, EventAttendance, User } from '@/payload-types'

let payload: Awaited<ReturnType<typeof getPayload>>
let testUser: User
let testEvent: Event
let testEventWithCapacity: Event

describe('Event Registration System', () => {
  beforeEach(async () => {
    payload = await getPayload({ config })

    // Create test user
    testUser = await payload.create({
      collection: 'users',
      data: {
        email: `test-${Date.now()}@example.com`,
        password: 'password123',
        name: 'Test User',
      },
    })

    // Create test event without capacity limit
    testEvent = await payload.create({
      collection: 'events',
      data: {
        title: 'Test Book Reading',
        description: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                version: 1,
                children: [{ type: 'text', version: 1, text: 'A test event' }],
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
        eventType: 'READING',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
        location: 'Test Location',
        maxAttendees: 0, // Unlimited
        currentAttendees: 0,
        status: 'UPCOMING',
        registrationRequired: true,
        isFree: true,
      },
    })

    // Create test event with capacity limit
    testEventWithCapacity = await payload.create({
      collection: 'events',
      data: {
        title: 'Limited Capacity Workshop',
        description: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                version: 1,
                children: [{ type: 'text', version: 1, text: 'A workshop with limited seats' }],
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
        eventType: 'WORKSHOP',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
        location: 'Test Venue',
        maxAttendees: 2, // Limited to 2 people
        currentAttendees: 0,
        status: 'UPCOMING',
        registrationRequired: true,
        isFree: false,
        price: 25,
      },
    })
  })

  afterEach(async () => {
    // Skip cleanup if payload wasn't initialized
    if (!payload) return

    // Clean up in correct order: attendance records first (due to foreign keys)
    const attendances = await payload.find({
      collection: 'event-attendance',
      limit: 1000,
    })
    for (const attendance of attendances.docs) {
      try {
        await payload.delete({ collection: 'event-attendance', id: attendance.id })
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    // Then delete users
    if (testUser) {
      try {
        await payload.delete({ collection: 'users', id: testUser.id })
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    // Then delete events
    if (testEvent) {
      try {
        await payload.delete({ collection: 'events', id: testEvent.id })
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    if (testEventWithCapacity) {
      try {
        await payload.delete({ collection: 'events', id: testEventWithCapacity.id })
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  })

  describe('Basic Registration', () => {
    test('should allow user to register for event without capacity limit', async () => {
      const attendance = await payload.create({
        collection: 'event-attendance',
        data: {
          event: testEvent.id,
          user: testUser.id,
          status: 'REGISTERED',
          registeredAt: new Date().toISOString(),
        },
      })

      expect(attendance).toBeDefined()
      expect(attendance.status).toBe('REGISTERED')
      // Relationships can be IDs or full objects depending on depth
      const eventId = typeof attendance.event === 'object' ? attendance.event.id : attendance.event
      const userId = typeof attendance.user === 'object' ? attendance.user.id : attendance.user
      expect(eventId).toBe(testEvent.id)
      expect(userId).toBe(testUser.id)
      expect(attendance.registeredAt).toBeDefined()

      // Verify event's currentAttendees was updated
      const updatedEvent = await payload.findByID({
        collection: 'events',
        id: testEvent.id,
      })
      expect(updatedEvent.currentAttendees).toBe(1)
    })

    test('should prevent duplicate registration', async () => {
      // First registration
      await payload.create({
        collection: 'event-attendance',
        data: {
          event: testEvent.id,
          user: testUser.id,
          status: 'REGISTERED',
          registeredAt: new Date().toISOString(),
        },
      })

      // Attempt duplicate registration
      await expect(
        payload.create({
          collection: 'event-attendance',
          data: {
            event: testEvent.id,
            user: testUser.id,
            status: 'REGISTERED',
            registeredAt: new Date().toISOString(),
          },
        }),
      ).rejects.toThrow('User is already registered for this event')
    })

    test('should allow registration after cancelling previous registration', async () => {
      // First registration
      const firstAttendance = await payload.create({
        collection: 'event-attendance',
        data: {
          event: testEvent.id,
          user: testUser.id,
          status: 'REGISTERED',
          registeredAt: new Date().toISOString(),
        },
      })

      // Cancel registration
      await payload.update({
        collection: 'event-attendance',
        id: firstAttendance.id,
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date().toISOString(),
        },
      })

      // Should allow re-registration
      const secondAttendance = await payload.create({
        collection: 'event-attendance',
        data: {
          event: testEvent.id,
          user: testUser.id,
          status: 'REGISTERED',
          registeredAt: new Date().toISOString(),
        },
      })

      expect(secondAttendance).toBeDefined()
      expect(secondAttendance.status).toBe('REGISTERED')
    })
  })

  describe('Capacity Management', () => {
    test('should register users within capacity', async () => {
      // Create two users and register both
      const user1 = await payload.create({
        collection: 'users',
        data: {
          email: `user1-${Date.now()}@example.com`,
          password: 'password123',
          name: 'User 1',
        },
      })

      const user2 = await payload.create({
        collection: 'users',
        data: {
          email: `user2-${Date.now()}@example.com`,
          password: 'password123',
          name: 'User 2',
        },
      })

      try {
        const attendance1 = await payload.create({
          collection: 'event-attendance',
          data: {
            event: testEventWithCapacity.id,
            user: user1.id,
            status: 'REGISTERED',
            registeredAt: new Date().toISOString(),
          },
        })

        const attendance2 = await payload.create({
          collection: 'event-attendance',
          data: {
            event: testEventWithCapacity.id,
            user: user2.id,
            status: 'REGISTERED',
            registeredAt: new Date().toISOString(),
          },
        })

        expect(attendance1.status).toBe('REGISTERED')
        expect(attendance2.status).toBe('REGISTERED')

        // Verify event's currentAttendees
        const updatedEvent = await payload.findByID({
          collection: 'events',
          id: testEventWithCapacity.id,
        })
        expect(updatedEvent.currentAttendees).toBe(2)
      } finally {
        // Cleanup - delete attendance records first
        const attendances = await payload.find({
          collection: 'event-attendance',
          where: {
            event: { equals: testEventWithCapacity.id },
          },
        })
        for (const att of attendances.docs) {
          await payload.delete({ collection: 'event-attendance', id: att.id })
        }
        // Then delete users
        await payload.delete({ collection: 'users', id: user1.id })
        await payload.delete({ collection: 'users', id: user2.id })
      }
    })

    test('should place user on waitlist when event is at capacity', async () => {
      // Fill capacity with 2 users
      const user1 = await payload.create({
        collection: 'users',
        data: {
          email: `user1-${Date.now()}@example.com`,
          password: 'password123',
          name: 'User 1',
        },
      })

      const user2 = await payload.create({
        collection: 'users',
        data: {
          email: `user2-${Date.now()}@example.com`,
          password: 'password123',
          name: 'User 2',
        },
      })

      const user3 = await payload.create({
        collection: 'users',
        data: {
          email: `user3-${Date.now()}@example.com`,
          password: 'password123',
          name: 'User 3',
        },
      })

      try {
        // Register first two users
        await payload.create({
          collection: 'event-attendance',
          data: {
            event: testEventWithCapacity.id,
            user: user1.id,
            status: 'REGISTERED',
            registeredAt: new Date().toISOString(),
          },
        })

        await payload.create({
          collection: 'event-attendance',
          data: {
            event: testEventWithCapacity.id,
            user: user2.id,
            status: 'REGISTERED',
            registeredAt: new Date().toISOString(),
          },
        })

        // Third user should be waitlisted
        const attendance3 = await payload.create({
          collection: 'event-attendance',
          data: {
            event: testEventWithCapacity.id,
            user: user3.id,
            status: 'REGISTERED', // Hook will change this to WAITLIST
            registeredAt: new Date().toISOString(),
          },
        })

        expect(attendance3.status).toBe('WAITLIST')

        // Event's currentAttendees should still be 2 (waitlist doesn't count)
        const updatedEvent = await payload.findByID({
          collection: 'events',
          id: testEventWithCapacity.id,
        })
        expect(updatedEvent.currentAttendees).toBe(2)
      } finally {
        // Cleanup - delete attendance records first
        const attendances = await payload.find({
          collection: 'event-attendance',
          where: {
            event: { equals: testEventWithCapacity.id },
          },
        })
        for (const att of attendances.docs) {
          await payload.delete({ collection: 'event-attendance', id: att.id })
        }
        // Then delete users
        await payload.delete({ collection: 'users', id: user1.id })
        await payload.delete({ collection: 'users', id: user2.id })
        await payload.delete({ collection: 'users', id: user3.id })
      }
    })
  })

  describe('Registration Cancellation', () => {
    test('should successfully cancel registration', async () => {
      const attendance = await payload.create({
        collection: 'event-attendance',
        data: {
          event: testEvent.id,
          user: testUser.id,
          status: 'REGISTERED',
          registeredAt: new Date().toISOString(),
        },
      })

      const cancelledAttendance = await payload.update({
        collection: 'event-attendance',
        id: attendance.id,
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date().toISOString(),
          cancellationReason: 'Test cancellation',
        },
      })

      expect(cancelledAttendance.status).toBe('CANCELLED')
      expect(cancelledAttendance.cancelledAt).toBeDefined()
      expect(cancelledAttendance.cancellationReason).toBe('Test cancellation')

      // Verify event's currentAttendees was decremented
      const updatedEvent = await payload.findByID({
        collection: 'events',
        id: testEvent.id,
      })
      expect(updatedEvent.currentAttendees).toBe(0)
    })

    test('should update attendee count when registration is cancelled', async () => {
      // Register user
      const attendance = await payload.create({
        collection: 'event-attendance',
        data: {
          event: testEvent.id,
          user: testUser.id,
          status: 'REGISTERED',
          registeredAt: new Date().toISOString(),
        },
      })

      // Verify count increased
      let event = await payload.findByID({
        collection: 'events',
        id: testEvent.id,
      })
      expect(event.currentAttendees).toBe(1)

      // Cancel registration
      await payload.update({
        collection: 'event-attendance',
        id: attendance.id,
        data: {
          status: 'CANCELLED',
        },
      })

      // Verify count decreased
      event = await payload.findByID({
        collection: 'events',
        id: testEvent.id,
      })
      expect(event.currentAttendees).toBe(0)
    })
  })

  describe('Check-in Functionality', () => {
    test('should successfully check in registered attendee', async () => {
      const attendance = await payload.create({
        collection: 'event-attendance',
        data: {
          event: testEvent.id,
          user: testUser.id,
          status: 'REGISTERED',
          registeredAt: new Date().toISOString(),
        },
      })

      const checkedInAttendance = await payload.update({
        collection: 'event-attendance',
        id: attendance.id,
        data: {
          status: 'ATTENDED',
          attendedAt: new Date().toISOString(),
        },
      })

      expect(checkedInAttendance.status).toBe('ATTENDED')
      expect(checkedInAttendance.attendedAt).toBeDefined()
    })

    test('should set timestamps correctly on status changes', async () => {
      const attendance = await payload.create({
        collection: 'event-attendance',
        data: {
          event: testEvent.id,
          user: testUser.id,
          status: 'REGISTERED',
          registeredAt: new Date().toISOString(),
        },
      })

      expect(attendance.registeredAt).toBeDefined()
      expect(attendance.attendedAt).toBeNull()
      expect(attendance.cancelledAt).toBeNull()

      // Mark as attended
      const attended = await payload.update({
        collection: 'event-attendance',
        id: attendance.id,
        data: {
          status: 'ATTENDED',
        },
      })

      expect(attended.attendedAt).toBeDefined()
    })
  })

  describe('Event Queries', () => {
    test('should retrieve all attendees for an event', async () => {
      // Register multiple users
      const user1 = await payload.create({
        collection: 'users',
        data: {
          email: `query-user1-${Date.now()}@example.com`,
          password: 'password123',
          name: 'Query User 1',
        },
      })

      const user2 = await payload.create({
        collection: 'users',
        data: {
          email: `query-user2-${Date.now()}@example.com`,
          password: 'password123',
          name: 'Query User 2',
        },
      })

      try {
        await payload.create({
          collection: 'event-attendance',
          data: {
            event: testEvent.id,
            user: user1.id,
            status: 'REGISTERED',
            registeredAt: new Date().toISOString(),
          },
        })

        await payload.create({
          collection: 'event-attendance',
          data: {
            event: testEvent.id,
            user: user2.id,
            status: 'REGISTERED',
            registeredAt: new Date().toISOString(),
          },
        })

        const attendees = await payload.find({
          collection: 'event-attendance',
          where: {
            event: { equals: testEvent.id },
          },
        })

        expect(attendees.totalDocs).toBe(2)
      } finally {
        // Cleanup - delete attendance records first
        const attendances = await payload.find({
          collection: 'event-attendance',
          where: {
            event: { equals: testEvent.id },
          },
        })
        for (const att of attendances.docs) {
          await payload.delete({ collection: 'event-attendance', id: att.id })
        }
        await payload.delete({ collection: 'users', id: user1.id })
        await payload.delete({ collection: 'users', id: user2.id })
      }
    })

    test('should filter attendees by status', async () => {
      const user1 = await payload.create({
        collection: 'users',
        data: {
          email: `status-user1-${Date.now()}@example.com`,
          password: 'password123',
          name: 'Status User 1',
        },
      })

      const user2 = await payload.create({
        collection: 'users',
        data: {
          email: `status-user2-${Date.now()}@example.com`,
          password: 'password123',
          name: 'Status User 2',
        },
      })

      try {
        // Register and cancel user1
        const attendance1 = await payload.create({
          collection: 'event-attendance',
          data: {
            event: testEvent.id,
            user: user1.id,
            status: 'REGISTERED',
            registeredAt: new Date().toISOString(),
          },
        })

        await payload.update({
          collection: 'event-attendance',
          id: attendance1.id,
          data: {
            status: 'CANCELLED',
          },
        })

        // Keep user2 registered
        await payload.create({
          collection: 'event-attendance',
          data: {
            event: testEvent.id,
            user: user2.id,
            status: 'REGISTERED',
            registeredAt: new Date().toISOString(),
          },
        })

        // Query only registered attendees
        const registeredAttendees = await payload.find({
          collection: 'event-attendance',
          where: {
            event: { equals: testEvent.id },
            status: { equals: 'REGISTERED' },
          },
        })

        expect(registeredAttendees.totalDocs).toBe(1)

        // Query cancelled attendees
        const cancelledAttendees = await payload.find({
          collection: 'event-attendance',
          where: {
            event: { equals: testEvent.id },
            status: { equals: 'CANCELLED' },
          },
        })

        expect(cancelledAttendees.totalDocs).toBe(1)
      } finally {
        // Cleanup - delete attendance records first
        const attendances = await payload.find({
          collection: 'event-attendance',
          where: {
            event: { equals: testEvent.id },
          },
        })
        for (const att of attendances.docs) {
          await payload.delete({ collection: 'event-attendance', id: att.id })
        }
        await payload.delete({ collection: 'users', id: user1.id })
        await payload.delete({ collection: 'users', id: user2.id })
      }
    })
  })
})
