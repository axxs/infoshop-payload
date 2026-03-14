import type { CollectionConfig, CollectionBeforeChangeHook } from 'payload'
import { blocks } from '@/blocks'
import { publishedOrAdmin } from '@/collections/access/publishedOrAdmin'
import { isAdminOrVolunteer, isAdmin } from '@/lib/access'
import { createSlugHook } from './utils/createSlugHook'

/** Slugs that conflict with existing static Next.js routes */
const RESERVED_SLUGS = new Set([
  'shop',
  'events',
  'cart',
  'checkout',
  'contact',
  'admin',
  'api',
  'news',
  'account',
  'login',
  'register',
  'next',
  'isbn',
])

const generatePageSlug = createSlugHook('pages')

/**
 * Prevent creating pages with slugs that conflict with static routes.
 */
const validateReservedSlug: CollectionBeforeChangeHook = async ({ data }) => {
  if (!data?.slug) return data

  if (RESERVED_SLUGS.has(data.slug)) {
    throw new Error(
      `The slug "${data.slug}" is reserved and cannot be used. Reserved slugs: ${[...RESERVED_SLUGS].join(', ')}`,
    )
  }

  return data
}

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
  },
  access: {
    read: publishedOrAdmin,
    create: isAdminOrVolunteer,
    update: isAdminOrVolunteer,
    delete: isAdmin,
  },
  versions: {
    drafts: {
      autosave: {
        interval: 300,
      },
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description: 'URL-friendly identifier (auto-generated from title)',
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Page description for SEO meta tags',
      },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Featured image for social sharing (Open Graph)',
      },
    },
    {
      name: 'blocks',
      type: 'blocks',
      blocks,
      admin: {
        description: 'Build the page layout by adding, removing, and reordering blocks',
      },
    },
  ],
  hooks: {
    beforeChange: [generatePageSlug, validateReservedSlug],
  },
}
