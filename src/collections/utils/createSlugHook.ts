import type { CollectionBeforeChangeHook, CollectionSlug } from 'payload'
import { slugify, generateUniqueSlug } from './slugify'

/**
 * Create a beforeChange hook that auto-generates a unique slug from the title field.
 * Reusable across any collection with `title` and `slug` fields.
 */
export function createSlugHook(collection: CollectionSlug): CollectionBeforeChangeHook {
  return async ({ data, operation, req, originalDoc }) => {
    if (!data) return data

    const needsSlug =
      operation === 'create' ? !data.slug : data.slug === '' || data.slug === null

    if (!needsSlug) return data

    const title = data.title ?? originalDoc?.title
    if (!title) return data

    const baseSlug = slugify(String(title))
    if (!baseSlug) return data

    const { docs: conflicting } = await req.payload.find({
      collection,
      where: {
        and: [
          { slug: { like: baseSlug } },
          ...(operation === 'update' && originalDoc?.id
            ? [{ id: { not_equals: originalDoc.id } }]
            : []),
        ],
      },
      limit: 1000,
      select: { slug: true },
    })

    const existingSlugs = conflicting
      .map((doc) => (doc as { slug?: string | null }).slug)
      .filter((s): s is string => Boolean(s))
      .filter((s) => s === baseSlug || /^-\d+$/.test(s.slice(baseSlug.length)))

    data.slug = generateUniqueSlug(baseSlug, existingSlugs)

    return data
  }
}
