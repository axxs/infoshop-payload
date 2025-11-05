/**
 * Square Catalog Sync Service
 * Handles synchronisation between Payload book inventory and Square catalog
 */

import { getPayload } from 'payload'
import config from '@payload-config'
import { getSquareClient, generateIdempotencyKey } from './client'
import type { Book } from '@/payload-types'

/**
 * Result of a Square sync operation
 */
export interface SquareSyncResult {
  success: boolean
  itemsProcessed: number
  itemsCreated: number
  itemsUpdated: number
  itemsFailed: number
  errors: Array<{
    bookId: string
    bookTitle: string
    error: string
  }>
}

/**
 * Square API batch size limit
 */
const SQUARE_MAX_BATCH_SIZE = 10

/**
 * Rate limit delay between batches (milliseconds)
 */
const SQUARE_RATE_LIMIT_DELAY_MS = 500

/**
 * Supported currencies for Square catalog
 */
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'] as const

/**
 * Square catalog object structure (simplified type for our use case)
 */
interface SquareCatalogObject {
  type: string
  id: string
  itemData?: {
    name: string
    description?: string
    variations?: unknown[]
    productType?: string
  }
  version?: number
}

/**
 * Convert Payload Book to Square CatalogObject
 * @throws Error if book data is invalid
 */
function bookToCatalogItem(book: Book): SquareCatalogObject {
  // Validate required fields
  if (!book.title || book.title.trim() === '') {
    throw new Error(`Book ${book.id} missing required title`)
  }

  // Validate sell price
  const sellPrice = Number(book.sellPrice)
  if (isNaN(sellPrice) || sellPrice < 0) {
    throw new Error(`Book ${book.id} has invalid sell price: ${book.sellPrice}`)
  }

  // Validate cost price
  const costPrice = Number(book.costPrice)
  if (isNaN(costPrice) || costPrice < 0) {
    throw new Error(`Book ${book.id} has invalid cost price: ${book.costPrice}`)
  }

  // Square expects amounts in the smallest currency unit (cents for USD/EUR/GBP)
  const costPriceCents = Math.round(costPrice * 100)
  const sellPriceCents = Math.round(sellPrice * 100)

  // Validate and use book currency or default to USD
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currencyCode = SUPPORTED_CURRENCIES.includes(book.currency as any) ? book.currency : 'USD'

  // Build item data
  const itemData: {
    name: string
    description?: string
    variations?: unknown[]
  } = {
    name: book.title,
    description: book.description
      ? typeof book.description === 'string'
        ? book.description
        : 'Book'
      : book.author
        ? `by ${book.author}`
        : 'Book',
  }

  // Create variation (represents the specific product SKU)
  const variationData: {
    type: string
    id: string
    itemVariationData: {
      itemId: string
      name: string
      pricingType: string
      priceMoney: {
        amount: bigint
        currency: string
      }
      trackInventory: boolean
      sku?: string
      itemVariationVendorInfos?: Array<{
        vendorId: string
        priceMoney: {
          amount: bigint
          currency: string
        }
      }>
    }
  } = {
    type: 'ITEM_VARIATION',
    id: `#${book.id}-variation`,
    itemVariationData: {
      itemId: `#${book.id}`,
      name: 'Standard',
      pricingType: 'FIXED_PRICING',
      priceMoney: {
        amount: BigInt(sellPriceCents),
        currency: currencyCode,
      },
      trackInventory: !book.isDigital,
    },
  }

  // Add cost data for Square's cost tracking
  if (costPriceCents > 0) {
    variationData.itemVariationData.itemVariationVendorInfos = [
      {
        vendorId: 'INFOSHOP',
        priceMoney: {
          amount: BigInt(costPriceCents),
          currency: currencyCode,
        },
      },
    ]
  }

  // Add SKU if ISBN is available
  if (book.isbn) {
    variationData.itemVariationData.sku = book.isbn
  }

  // Create the main catalog item
  const catalogItem = {
    type: 'ITEM',
    id: `#${book.id}`,
    itemData: {
      ...itemData,
      variations: [variationData],
      productType: 'REGULAR',
    },
  }

  return catalogItem
}

/**
 * Push a batch of books to Square catalog
 * Creates new items or updates existing ones
 */
export async function pushBooksToSquare(
  bookIds: string[],
  options: {
    batchSize?: number // Max 10 due to Square API limits
    updateExisting?: boolean
  } = {},
): Promise<SquareSyncResult> {
  const { batchSize = SQUARE_MAX_BATCH_SIZE, updateExisting = true } = options

  // Validate batch size
  if (batchSize > SQUARE_MAX_BATCH_SIZE) {
    throw new Error(`Batch size cannot exceed ${SQUARE_MAX_BATCH_SIZE} (Square API limit)`)
  }

  const result: SquareSyncResult = {
    success: true,
    itemsProcessed: 0,
    itemsCreated: 0,
    itemsUpdated: 0,
    itemsFailed: 0,
    errors: [],
  }

  const payload = await getPayload({ config })
  const squareClient = getSquareClient()

  // Fetch books from Payload
  const { docs: books } = await payload.find({
    collection: 'books',
    where: {
      id: {
        in: bookIds,
      },
    },
    limit: bookIds.length,
  })

  if (books.length === 0) {
    console.warn('No books found for Square sync', { bookIds })
    return result
  }

  console.info('Starting Square catalog sync', {
    totalBooks: books.length,
    batchSize,
    updateExisting,
  })

  // Process in batches (Square API limit is 10 items per batch)
  for (let i = 0; i < books.length; i += batchSize) {
    const batch = books.slice(i, i + batchSize)
    const idempotencyKey = generateIdempotencyKey()

    try {
      // Build catalog objects for batch upsert (handles both creates and updates)
      const catalogObjects: SquareCatalogObject[] = []
      const bookMap = new Map<string, Book>() // Map temp ID to book for matching

      for (const book of batch) {
        if (book.squareCatalogObjectId && updateExisting) {
          // Update existing item
          const catalogItem = bookToCatalogItem(book)
          catalogItem.id = book.squareCatalogObjectId
          catalogItem.version = undefined // Square will use latest version
          catalogObjects.push(catalogItem)
          bookMap.set(book.squareCatalogObjectId, book)
        } else if (!book.squareCatalogObjectId) {
          // Create new item with temporary ID
          const catalogItem = bookToCatalogItem(book)
          catalogObjects.push(catalogItem)
          bookMap.set(`#${book.id}`, book)
        }
      }

      if (catalogObjects.length === 0) {
        continue
      }

      // Batch upsert all items (creates and updates together)
      const upsertResult = await squareClient.catalog.batchUpsert({
        idempotencyKey,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        batches: [{ objects: catalogObjects as any }],
      })

      if (upsertResult.objects) {
        // Update Payload database with Square IDs
        for (const squareObject of upsertResult.objects) {
          if (!squareObject?.id) continue

          // Find matching book by Square ID or temporary ID
          let book = bookMap.get(squareObject.id)
          if (!book) {
            // Try finding by temporary ID pattern
            const tempIdMatch = Array.from(bookMap.keys()).find((key) =>
              squareObject.id?.includes(key.replace('#', '')),
            )
            if (tempIdMatch) {
              book = bookMap.get(tempIdMatch)
            }
          }

          // If no match found, fail explicitly to prevent data corruption
          if (!book) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const itemData = (squareObject as any).itemData
            console.error('CRITICAL: Could not match Square object to book', {
              squareObjectId: squareObject.id,
              squareObjectName: itemData?.name,
              availableKeys: Array.from(bookMap.keys()),
            })
            result.errors.push({
              bookId: 'UNKNOWN',
              bookTitle: itemData?.name || 'Unknown',
              error: `Square object ${squareObject.id} could not be matched to any book in batch`,
            })
            result.itemsFailed++
            continue
          }

          const wasCreate = !book.squareCatalogObjectId

          try {
            await payload.update({
              collection: 'books',
              id: book.id,
              data: {
                squareCatalogObjectId: squareObject.id,
                squareLastSyncedAt: new Date().toISOString(),
              },
            })

            if (wasCreate) {
              result.itemsCreated++
              console.info('Created Square catalog item', {
                bookId: book.id,
                bookTitle: book.title,
                squareItemId: squareObject.id,
              })
            } else {
              result.itemsUpdated++
              console.info('Updated Square catalog item', {
                bookId: book.id,
                bookTitle: book.title,
                squareItemId: squareObject.id,
              })
            }
          } catch (dbError) {
            console.error('Failed to update Payload after Square sync', {
              bookId: book.id,
              squareItemId: squareObject.id,
              error: dbError,
            })
            result.errors.push({
              bookId: String(book.id),
              bookTitle: book.title,
              error: `${wasCreate ? 'Created' : 'Updated'} in Square but failed to update local database`,
            })
            result.itemsFailed++
          }
        }
      }

      result.itemsProcessed += batch.length
    } catch (error) {
      console.error('Batch sync failed', { error })
      batch.forEach((book) => {
        result.errors.push({
          bookId: String(book.id),
          bookTitle: book.title,
          error: error instanceof Error ? error.message : 'Batch failed',
        })
        result.itemsFailed++
      })
    }

    // Add delay between batches to respect rate limits
    if (i + batchSize < books.length) {
      await new Promise((resolve) => setTimeout(resolve, SQUARE_RATE_LIMIT_DELAY_MS))
    }
  }

  result.success = result.itemsFailed === 0

  console.info('Square catalog sync completed', {
    ...result,
  })

  return result
}

/**
 * Sync all books that haven't been synced yet
 * Handles pagination for large datasets
 */
export async function syncUnsyncedBooks(): Promise<SquareSyncResult> {
  const payload = await getPayload({ config })
  let page = 1
  const pageSize = 100
  let hasMore = true
  const allBookIds: string[] = []

  // Paginate through all unsynced books
  while (hasMore) {
    const { docs, hasNextPage } = await payload.find({
      collection: 'books',
      where: {
        squareCatalogObjectId: {
          exists: false,
        },
      },
      limit: pageSize,
      page,
    })

    allBookIds.push(...docs.map((b) => String(b.id)))
    hasMore = hasNextPage || false
    page++
  }

  console.info('Syncing unsynced books to Square', {
    count: allBookIds.length,
  })

  if (allBookIds.length === 0) {
    return {
      success: true,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsFailed: 0,
      errors: [],
    }
  }

  return pushBooksToSquare(allBookIds)
}

/**
 * Sync books that have been updated since last sync
 * Handles pagination for large datasets
 */
export async function syncModifiedBooks(since?: Date): Promise<SquareSyncResult> {
  const payload = await getPayload({ config })

  const whereClause: {
    squareCatalogObjectId: { exists: boolean }
    updatedAt?: { greater_than: string }
  } = {
    squareCatalogObjectId: {
      exists: true,
    },
  }

  if (since) {
    whereClause.updatedAt = {
      greater_than: since.toISOString(),
    }
  }

  let page = 1
  const pageSize = 100
  let hasMore = true
  const allBookIds: string[] = []

  // Paginate through all modified books
  while (hasMore) {
    const { docs, hasNextPage } = await payload.find({
      collection: 'books',
      where: whereClause,
      limit: pageSize,
      page,
    })

    allBookIds.push(...docs.map((b) => String(b.id)))
    hasMore = hasNextPage || false
    page++
  }

  console.info('Syncing modified books to Square', {
    count: allBookIds.length,
    since: since?.toISOString(),
  })

  if (allBookIds.length === 0) {
    return {
      success: true,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsFailed: 0,
      errors: [],
    }
  }

  return pushBooksToSquare(allBookIds, { updateExisting: true })
}
