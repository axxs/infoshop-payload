import type { CollectionConfig } from 'payload'
import {
  validateCapacityAndSetStatus,
  preventDuplicateRegistration,
  updateEventAttendeeCount,
  setTimestamps,
} from './EventAttendance/hooks'
import { isAuthenticated, isAdminOrVolunteer, isAdminOrVolunteerOrSelf } from '@/lib/access'

export const EventAttendance: CollectionConfig = {
  slug: 'event-attendance',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['event', 'user', 'status', 'registeredAt'],
    description: 'Event registration and attendance tracking',
  },
  access: {
    read: isAdminOrVolunteerOrSelf('user'),
    create: isAuthenticated,
    update: isAdminOrVolunteer,
    delete: isAdminOrVolunteer,
  },
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      admin: {
        description: 'Event being attended',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'User attending the event',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'REGISTERED',
      options: [
        { label: 'Registered', value: 'REGISTERED' },
        { label: 'Attended', value: 'ATTENDED' },
        { label: 'Cancelled', value: 'CANCELLED' },
        { label: 'Waitlist', value: 'WAITLIST' },
      ],
      admin: {
        description: 'Current attendance status',
      },
    },
    {
      name: 'registeredAt',
      type: 'date',
      required: true,
      admin: {
        description: 'Date and time of registration',
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'attendedAt',
      type: 'date',
      admin: {
        description: 'Date and time user checked in (attended)',
        readOnly: true,
        condition: (data) => data.status === 'ATTENDED',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'cancelledAt',
      type: 'date',
      admin: {
        description: 'Date and time registration was cancelled',
        readOnly: true,
        condition: (data) => data.status === 'CANCELLED',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'cancellationReason',
      type: 'textarea',
      admin: {
        description: 'Reason for cancellation (optional)',
        condition: (data) => data.status === 'CANCELLED',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Internal notes about this registration',
      },
    },
  ],
  hooks: {
    beforeValidate: [preventDuplicateRegistration, validateCapacityAndSetStatus],
    beforeChange: [setTimestamps],
    afterChange: [updateEventAttendeeCount],
  },
  timestamps: true,
}
