import type { CollectionConfig, CollectionBeforeChangeHook } from 'payload'
import { blocks } from '@/blocks'
import { publishedOrAdmin } from '@/collections/access/publishedOrAdmin'
import { isAdminOrVolunteer, isAdmin } from '@/lib/access'
import { createSlugHook } from './utils/createSlugHook'

const generatePostSlug = createSlugHook('posts')

/**
 * Set author to current user on create if not already set.
 */
const setAuthor: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (!data) return data

  if (operation === 'create' && !data.author && req.user) {
    data.author = req.user.id
  }

  return data
}

/**
 * Default publishedDate to now on create if not set.
 */
const setPublishedDate: CollectionBeforeChangeHook = async ({ data, operation }) => {
  if (!data) return data

  if (operation === 'create' && !data.publishedDate) {
    data.publishedDate = new Date().toISOString()
  }

  return data
}

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'publishedDate', '_status', 'updatedAt'],
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
        interval: 10000,
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
        description: 'URL-friendly identifier (auto-generated from title, editable)',
        position: 'sidebar',
      },
    },
    {
      name: 'publishedDate',
      type: 'date',
      admin: {
        position: 'sidebar',
        description: 'Publication date (defaults to creation time)',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
        description: 'Post author (auto-set on create)',
      },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Featured image for the post',
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      maxLength: 300,
      admin: {
        description: 'Short summary for listing pages (max 300 characters)',
      },
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: {
        description: 'Post categories',
      },
    },
    {
      name: 'blocks',
      type: 'blocks',
      blocks,
      admin: {
        description: 'Build the post content by adding blocks',
      },
    },
  ],
  hooks: {
    beforeChange: [generatePostSlug, setAuthor, setPublishedDate],
  },
}
