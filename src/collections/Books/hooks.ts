/**
 * Books Collection Hooks
 * Business logic for inventory management, pricing validation, and stock control
 */

import type { CollectionBeforeChangeHook, CollectionAfterChangeHook } from 'payload'
import { processAndLinkSubjects } from '@/lib/openLibrary/subjectManager'
import { slugify, generateUniqueSlug } from '../utils/slugify'

/**
 * Validate ISBN format (ISBN-10 or ISBN-13)
 * Exported for reuse in ISBN redirect route
 */
export function validateISBN(isbn: string | null | undefined): boolean {
  if (!isbn) return true // ISBN is optional

  // Remove hyphens and spaces
  const cleaned = isbn.replace(/[-\s]/g, '')

  // ISBN-10: 10 digits, last can be X
  const isbn10Regex = /^\d{9}[\dX]$/
  // ISBN-13: 13 digits starting with 978 or 979
  const isbn13Regex = /^(978|979)\d{10}$/

  return isbn10Regex.test(cleaned) || isbn13Regex.test(cleaned)
}

/**
 * Generate URL-friendly slug from book title
 * - Runs on create (always) and update (only if slug is missing/cleared)
 * - Queries existing slugs to guarantee uniqueness with a counter suffix
 */
export const generateBookSlug: CollectionBeforeChangeHook = async ({ data, operation, req, originalDoc }) => {
  if (!data) return data

  // Only generate on create, or on update when slug is explicitly cleared
  // undefined means "not sent" (normal update) — only '' or null means "cleared"
  const needsSlug =
    operation === 'create'
      ? !data.slug
      : data.slug === '' || data.slug === null

  if (!needsSlug) return data

  const title = data.title ?? originalDoc?.title
  if (!title) return data

  const baseSlug = slugify(String(title))

  // Find existing slugs that contain the base slug to detect conflicts.
  // Payload's `like` is a substring match (SQL LIKE '%val%'), so we filter
  // in-memory to only keep exact matches or `baseSlug-N` suffixed variants.
  //
  // Known limitations:
  // - Not atomic: concurrent creates with the same title can race. The `unique`
  //   DB constraint catches duplicates, but the error is unhandled. Low risk
  //   for a single-admin CMS.
  // - Hard cap of 1000 results: if exceeded, conflicts past the cap are missed
  //   and the DB unique constraint becomes the safety net.
  const { docs: conflicting } = await req.payload.find({
    collection: 'books',
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
    .map((doc) => doc.slug)
    .filter((s): s is string => Boolean(s))
    .filter((s) => s === baseSlug || /^-\d+$/.test(s.slice(baseSlug.length)))

  data.slug = generateUniqueSlug(baseSlug, existingSlugs)

  return data
}

/**
 * Stock Validation Hook
 * Prevents negative stock and validates stock changes
 */
export const validateStock: CollectionBeforeChangeHook = async ({
  data,
  operation: _operation,
}) => {
  if (!data) return data

  // Ensure stock quantity is never negative
  if (data.stockQuantity !== undefined && data.stockQuantity < 0) {
    throw new Error('Stock quantity cannot be negative')
  }

  // Validate reorder level
  if (data.reorderLevel !== undefined && data.reorderLevel < 0) {
    throw new Error('Reorder level cannot be negative')
  }

  return data
}

/**
 * Price Validation Hook
 * Ensures pricing logic: cost ≤ member ≤ sell
 */
export const validatePricing: CollectionBeforeChangeHook = async ({ data, req }) => {
  if (!data) return data

  const { costPrice, memberPrice, sellPrice } = data

  // All three prices must exist for validation
  if (
    costPrice === undefined ||
    memberPrice === undefined ||
    sellPrice === undefined ||
    costPrice === null ||
    memberPrice === null ||
    sellPrice === null
  ) {
    return data
  }

  // Validate pricing hierarchy
  if (memberPrice < costPrice) {
    throw new Error(
      `Member price (${memberPrice}) cannot be below cost price (${costPrice}). Members must not purchase below cost.`,
    )
  }

  if (sellPrice < memberPrice) {
    throw new Error(
      `Sell price (${sellPrice}) cannot be below member price (${memberPrice}). Public price must be at or above member price.`,
    )
  }

  // Reject if selling below cost (negative margin = financial loss)
  if (sellPrice < costPrice) {
    throw new Error(
      `Sell price (${sellPrice}) cannot be below cost price (${costPrice}). This would result in a loss of ${(costPrice - sellPrice).toFixed(2)} per unit.`,
    )
  }

  return data
}

/**
 * ISBN Validation Hook
 * Validates ISBN-10 or ISBN-13 format
 */
export const validateISBNFormat: CollectionBeforeChangeHook = async ({ data }) => {
  if (!data) return data

  if (data.isbn && !validateISBN(data.isbn)) {
    throw new Error(
      `Invalid ISBN format: "${data.isbn}". Must be a valid ISBN-10 (10 digits) or ISBN-13 (13 digits starting with 978/979).`,
    )
  }

  return data
}

/**
 * Auto-calculate Stock Status
 * Updates stock status based on quantity and reorder level
 */
export const calculateStockStatus: CollectionBeforeChangeHook = async ({ data, context }) => {
  if (!data) return data

  // Skip when called from backfill scripts that only set slug
  if (context?.skipInventoryHooks) return data

  // Only auto-calculate if not manually set to DISCONTINUED
  if (data.stockStatus === 'DISCONTINUED') {
    return data
  }

  const quantity = data.stockQuantity ?? 0
  const reorderLevel = data.reorderLevel ?? 5

  if (quantity === 0) {
    data.stockStatus = 'OUT_OF_STOCK'
  } else if (quantity <= reorderLevel) {
    data.stockStatus = 'LOW_STOCK'
  } else {
    data.stockStatus = 'IN_STOCK'
  }

  return data
}

/**
 * Low Stock Warning Hook
 * Logs warnings for low stock items (could send notifications in future)
 */
export const checkLowStock: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  // Only check on update operations
  if (operation !== 'update') return doc

  const quantity = doc.stockQuantity ?? 0
  const reorderLevel = doc.reorderLevel ?? 5

  if (quantity > 0 && quantity <= reorderLevel) {
    req.payload.logger.warn({
      msg: 'Low stock alert',
      book: doc.title,
      isbn: doc.isbn || 'N/A',
      current: quantity,
      reorderLevel,
      bookId: doc.id,
    })
  }

  if (quantity === 0) {
    req.payload.logger.error({
      msg: 'Out of stock',
      book: doc.title,
      isbn: doc.isbn || 'N/A',
      bookId: doc.id,
    })
  }

  return doc
}

/**
 * Digital Product Validation
 * Ensures digital products don't track inventory
 */
export const validateDigitalProduct: CollectionBeforeChangeHook = async ({ data }) => {
  if (!data) return data

  // Digital products shouldn't have stock constraints
  if (data.isDigital) {
    // Set stock to a high number for digital products (unlimited)
    if (data.stockQuantity === undefined || data.stockQuantity === 0) {
      data.stockQuantity = 999999
    }
    // Digital products always "in stock"
    data.stockStatus = 'IN_STOCK'
  }

  return data
}

/**
 * Process Subjects from ISBN Lookup
 * After a book is created/updated, process any temporary subject names from ISBN lookup
 *
 * @remarks
 * Recursion-safe: The cleanup update passes skipHooks context to prevent re-triggering
 */
export const processSubjectsFromISBN: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
  context,
}) => {
  // Skip if this update is from our cleanup operation (prevent recursion)
  if (context?.skipSubjectProcessing) {
    return doc
  }

  // Only process on create and update operations (skip delete)
  if (operation !== 'create' && operation !== 'update') return doc

  // Check if we have temporary subject names from ISBN lookup
  // This also guards against recursion if _subjectNames is cleared
  const subjectNames = doc._subjectNames as string[] | undefined

  if (!subjectNames || !Array.isArray(subjectNames) || subjectNames.length === 0) {
    return doc
  }

  try {
    req.payload.logger.info({
      msg: 'Processing subjects from ISBN lookup',
      bookId: doc.id,
      operation,
      subjectCount: subjectNames.length,
    })

    // Process and link subjects
    const linkedCount = await processAndLinkSubjects(req.payload, doc.id, subjectNames, {
      maxSubjects: 10,
      skipGeneric: true,
    })

    req.payload.logger.info({
      msg: 'Successfully processed subjects from ISBN lookup',
      bookId: doc.id,
      operation,
      linkedCount,
    })

    // Clear the temporary field after successful processing
    // Pass context flag to prevent recursion (this update won't trigger the hook again)
    await req.payload.update({
      collection: 'books',
      id: doc.id,
      data: {
        _subjectNames: null,
      },
      context: {
        skipSubjectProcessing: true,
      },
    })

    req.payload.logger.info({
      msg: 'Cleared temporary subject names field',
      bookId: doc.id,
    })
  } catch (error) {
    req.payload.logger.error({
      msg: 'Failed to process subjects from ISBN lookup',
      bookId: doc.id,
      operation,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    // Don't throw - allow book creation/update to succeed even if subject processing fails
  }

  return doc
}
