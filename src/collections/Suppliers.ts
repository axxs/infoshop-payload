import type { CollectionConfig } from 'payload'
import { isAdminOrVolunteer } from '@/lib/access'

export const Suppliers: CollectionConfig = {
  slug: 'suppliers',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: isAdminOrVolunteer,
    create: isAdminOrVolunteer,
    update: isAdminOrVolunteer,
    delete: isAdminOrVolunteer,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'contactEmail',
      type: 'email',
    },
    {
      name: 'contactPhone',
      type: 'text',
    },
    {
      name: 'website',
      type: 'text',
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
}
