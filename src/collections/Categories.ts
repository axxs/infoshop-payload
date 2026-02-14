import type { CollectionConfig } from 'payload'
import { slugify } from './utils/slugify'
import { publicRead, isAdminOrVolunteer } from '@/lib/access'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: publicRead,
    create: isAdminOrVolunteer,
    update: isAdminOrVolunteer,
    delete: isAdminOrVolunteer,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly identifier (auto-generated from name if empty)',
      },
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      admin: {
        description: 'Parent category for hierarchical organisation',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        // Auto-generate slug from name if not provided
        if (data?.name && (!data.slug || operation === 'create')) {
          data.slug = slugify(data.name)
        }
        return data
      },
    ],
  },
}
