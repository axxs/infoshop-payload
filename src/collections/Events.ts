import type { CollectionConfig } from 'payload'
import { publicRead, isAdminOrVolunteer } from '@/lib/access'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'eventType', 'startDate', 'status'],
  },
  access: {
    read: publicRead,
    create: isAdminOrVolunteer,
    update: isAdminOrVolunteer,
    delete: isAdminOrVolunteer,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'richText',
      required: true,
    },
    {
      name: 'eventType',
      type: 'select',
      required: true,
      options: [
        { label: 'Book Signing', value: 'BOOK_SIGNING' },
        { label: 'Author Reading', value: 'READING' },
        { label: 'Discussion Group', value: 'DISCUSSION' },
        { label: 'Workshop', value: 'WORKSHOP' },
        { label: 'Film Screening', value: 'SCREENING' },
        { label: 'Community Meeting', value: 'MEETING' },
        { label: 'Other', value: 'OTHER' },
      ],
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'endDate',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'location',
      type: 'text',
    },
    {
      name: 'maxAttendees',
      type: 'number',
      min: 0,
      admin: {
        description: 'Maximum capacity (0 = unlimited)',
      },
    },
    {
      name: 'currentAttendees',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        description: 'Current number of registered attendees',
        readOnly: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'UPCOMING',
      options: [
        { label: 'Upcoming', value: 'UPCOMING' },
        { label: 'Ongoing', value: 'ONGOING' },
        { label: 'Completed', value: 'COMPLETED' },
        { label: 'Cancelled', value: 'CANCELLED' },
      ],
    },
    {
      name: 'registrationRequired',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'isFree',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'price',
      type: 'number',
      min: 0,
      admin: {
        condition: (data) => data.isFree === false,
        description: 'Event ticket price',
        step: 0.01,
      },
    },
  ],
}
