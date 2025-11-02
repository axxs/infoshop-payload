/**
 * Square Catalog Sync Service
 * Handles synchronization between Payload book inventory and Square catalog
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
 * Convert Payload Book to Square CatalogObject
 */
function bookToCatalogItem(book: Book): unknown {
  // Square expects amounts in the smallest currency unit (cents for USD/EUR/GBP)
  const costPriceCents = Math.round(Number(book.costPrice) * 100)
  const sellPriceCents = Math.round(Number(book.sellPrice) * 100)

  // Use book currency or default to USD
  const currencyCode = book.currency || 'USD'

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
    batchSize?: number
    updateExisting?: boolean
  } = {},
): Promise<SquareSyncResult> {
  const { batchSize = 10, updateExisting = true } = options

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
      // Separate books into create vs update
      const booksToCreate: Book[] = []
      const booksToUpdate: Book[] = []

      for (const book of batch) {
        if (book.squareCatalogObjectId && updateExisting) {
          booksToUpdate.push(book)
        } else if (!book.squareCatalogObjectId) {
          booksToCreate.push(book)
        }
      }

      // Create new items
      if (booksToCreate.length > 0) {
        const catalogObjects = booksToCreate.map(bookToCatalogItem)

        try {
          const { result: createResult } =
            await squareClient.catalogApi.batchUpsertCatalogObjects({
              idempotencyKey,
              batches: [
                {
                  objects: catalogObjects,
                },
              ],
            })

          if (createResult.objects) {
            // Update Payload database with Square IDs
            for (let j = 0; j < booksToCreate.length; j++) {
              const book = booksToCreate[j]
              const squareObject = createResult.objects[j]

              if (squareObject?.id) {
                await payload.update({
                  collection: 'books',
                  id: book.id,
                  data: {
                    squareCatalogObjectId: squareObject.id,
                    squareLastSyncedAt: new Date().toISOString(),
                  },
                })

                result.itemsCreated++
                console.info('Created Square catalog item', {
                  bookId: book.id,
                  bookTitle: book.title,
                  squareItemId: squareObject.id,
                })
              }
            }
          }
        } catch (error) {
          console.error('Failed to create Square catalog items', { error })
          booksToCreate.forEach((book) => {
            result.errors.push({
              bookId: book.id,
              bookTitle: book.title,
              error: error instanceof Error ? error.message : 'Creation failed',
            })
            result.itemsFailed++
          })
        }
      }

      // Update existing items
      if (booksToUpdate.length > 0) {
        for (const book of booksToUpdate) {
          try {
            const catalogItem = bookToCatalogItem(book) as {
              id?: string
              version?: number
            }
            catalogItem.id = book.squareCatalogObjectId || undefined
            catalogItem.version = undefined // Square will use latest version

            const { result: updateResult } =
              await squareClient.catalogApi.upsertCatalogObject({
                idempotencyKey: generateIdempotencyKey(),
                object: catalogItem,
              })

            if (updateResult.catalogObject) {
              await payload.update({
                collection: 'books',
                id: book.id,
                data: {
                  squareLastSyncedAt: new Date().toISOString(),
                },
              })

              result.itemsUpdated++
              console.info('Updated Square catalog item', {
                bookId: book.id,
                bookTitle: book.title,
                squareItemId: book.squareCatalogObjectId,
              })
            }
          } catch (error) {
            console.error('Failed to update Square catalog item', {
              bookId: book.id,
              error,
            })
            result.errors.push({
              bookId: book.id,
              bookTitle: book.title,
              error: error instanceof Error ? error.message : 'Update failed',
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
          bookId: book.id,
          bookTitle: book.title,
          error: error instanceof Error ? error.message : 'Batch failed',
        })
        result.itemsFailed++
      })
    }

    // Add delay between batches to respect rate limits
    if (i + batchSize < books.length) {
      await new Promise((resolve) => setTimeout(resolve, 500))
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
 */
export async function syncUnsyncedBooks(): Promise<SquareSyncResult> {
  const payload = await getPayload({ config })

  const { docs: unsyncedBooks } = await payload.find({
    collection: 'books',
    where: {
      squareCatalogObjectId: {
        exists: false,
      },
    },
    limit: 1000,
  })

  const bookIds = unsyncedBooks.map((b) => b.id)

  console.info('Syncing unsynced books to Square', {
    count: bookIds.length,
  })

  if (bookIds.length === 0) {
    return {
      success: true,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsFailed: 0,
      errors: [],
    }
  }

  return pushBooksToSquare(bookIds)
}

/**
 * Sync books that have been updated since last sync
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

  const { docs: modifiedBooks } = await payload.find({
    collection: 'books',
    where: whereClause,
    limit: 1000,
  })

  const bookIds = modifiedBooks.map((b) => b.id)

  console.info('Syncing modified books to Square', {
    count: bookIds.length,
    since: since?.toISOString(),
  })

  if (bookIds.length === 0) {
    return {
      success: true,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsFailed: 0,
      errors: [],
    }
  }

  return pushBooksToSquare(bookIds, { updateExisting: true })
}
