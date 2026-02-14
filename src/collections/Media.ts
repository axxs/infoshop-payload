import type { CollectionConfig } from 'payload'
import { publicRead, isAdminOrVolunteer } from '@/lib/access'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: publicRead,
    create: isAdminOrVolunteer,
    update: isAdminOrVolunteer,
    delete: isAdminOrVolunteer,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: true,
}
