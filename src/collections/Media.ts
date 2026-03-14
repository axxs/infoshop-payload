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
    {
      name: 'book',
      type: 'relationship',
      relationTo: 'books',
      admin: {
        description: 'Book this image is a cover for (set automatically)',
      },
    },
  ],
  upload: true,
}
