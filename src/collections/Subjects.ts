import type { CollectionConfig } from 'payload'
import { slugify } from './utils/slugify'

export const Subjects: CollectionConfig = {
  slug: 'subjects',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
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
      name: 'normalizedName',
      type: 'text',
      required: true,
      index: true,
      admin: {
        hidden: true,
        description: 'Normalized name for case-insensitive lookups (auto-generated)',
      },
    },
    {
      name: 'description',
      type: 'textarea',
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        if (!data) return data

        // Auto-generate slug from name if not provided
        if (data.name && (!data.slug || operation === 'create')) {
          data.slug = slugify(data.name)
        }

        // Auto-generate normalizedName for case-insensitive lookups
        if (data.name) {
          data.normalizedName = data.name
            .trim()
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, ' ')
        }

        return data
      },
    ],
  },
}
