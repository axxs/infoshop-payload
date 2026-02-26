import type { CollectionConfig } from 'payload'
import { isAdminOrVolunteer } from '@/lib/access'

export const ContactSubmissions: CollectionConfig = {
  slug: 'contact-submissions',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'status', 'createdAt'],
  },
  access: {
    read: isAdminOrVolunteer,
    create: () => true,
    update: isAdminOrVolunteer,
    delete: isAdminOrVolunteer,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      maxLength: 200,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
      maxLength: 5000,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Read', value: 'read' },
        { label: 'Replied', value: 'replied' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
