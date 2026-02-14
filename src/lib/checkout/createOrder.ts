/**
 * Order Creation Logic
 * Creates Sale and SaleItem records after successful payment
 */

'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import type { PopulatedCart } from '../cart/types'
import { isCartExpired } from '../cart/validation'
import { calculateTax } from '../tax/taxCalculation'

export interface CreateOrderParams {
  cart: PopulatedCart
  squareTransactionId: string
  squareReceiptUrl?: string
  paymentMethod: 'CARD' | 'CASH' | 'OTHER'
  customerEmail?: string
  customerName?: string
  customerId?: number // User ID if authenticated
  status?: 'PENDING' | 'PROCESSING' | 'COMPLETED'
}

export interface CreateOrderResult {
  success: boolean
  saleId?: number
  error?: string
  warnings?: string[]
}

/**
 * Create Sale record and update stock quantities
 * Handles atomic stock updates and validates cart integrity
 */
export async function createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const {
    cart,
    squareTransactionId,
    squareReceiptUrl,
    paymentMethod,
    customerEmail,
    customerName,
    customerId,
    status = 'COMPLETED',
  } = params

  try {
    const payload = await getPayload({ config })
    const warnings: string[] = []

    // 1. Validate cart hasn't expired
    if (isCartExpired(cart)) {
      return {
        success: false,
        error: 'Cart has expired. Please add items again.',
      }
    }

    // 2. Batch fetch all books to check stock and prices (prevents N+1 queries)
    const bookIds = cart.items.map((item) => item.bookId)
    const { docs: currentBooks } = await payload.find({
      collection: 'books',
      where: {
        id: {
          in: bookIds,
        },
      },
      limit: bookIds.length,
    })

    // Create lookup map for O(1) access
    const bookMap = new Map(currentBooks.map((book) => [book.id, book]))

    // 3. Validate all books exist and have sufficient stock
    const validatedItems = []
    const stockUpdates = []

    for (const item of cart.items) {
      const currentBook = bookMap.get(item.bookId)

      // Check if book still exists
      if (!currentBook) {
        warnings.push(
          `Book "${item.book.title}" (ID: ${item.bookId}) no longer exists and was removed from order`,
        )
        continue
      }

      // Check stock availability (CRITICAL: prevent overselling)
      if (currentBook.stockQuantity < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for "${currentBook.title}". Available: ${currentBook.stockQuantity}, Requested: ${item.quantity}`,
        }
      }

      // Check price staleness (warn if price changed significantly)
      const currentPrice = item.isMemberPrice
        ? Number(currentBook.memberPrice)
        : Number(currentBook.sellPrice)
      const priceChange = Math.abs(currentPrice - item.priceAtAdd)
      const priceChangePercent = (priceChange / item.priceAtAdd) * 100

      if (priceChangePercent > 10) {
        // Price changed more than 10%
        warnings.push(
          `Price for "${currentBook.title}" has changed from ${item.priceAtAdd} to ${currentPrice} (${priceChangePercent.toFixed(1)}% change)`,
        )
      }

      validatedItems.push(item)
      stockUpdates.push({
        bookId: item.bookId,
        quantityToDeduct: item.quantity,
      })
    }

    // 4. If all items were deleted, cannot proceed
    if (validatedItems.length === 0) {
      return {
        success: false,
        error: 'All items in cart no longer exist',
      }
    }

    // 5. Calculate total (including tax if applicable)
    const taxCalculation = calculateTax(cart.subtotal, cart.currency)
    const totalAmount = taxCalculation.totalWithTax

    // 6. Create SaleItem records (use validated items only)
    const saleItemIds: number[] = []

    for (const item of validatedItems) {
      const saleItem = await payload.create({
        collection: 'sale-items',
        draft: false,
        data: {
          book: item.bookId,
          quantity: item.quantity,
          unitPrice: item.priceAtAdd,
          discount: 0,
          priceType: item.isMemberPrice ? 'MEMBER' : 'RETAIL',
          lineTotal: item.lineTotal,
        },
      })

      saleItemIds.push(saleItem.id)
    }

    // 7. Atomic stock updates with optimistic locking
    // Uses updatedAt as a version check to detect concurrent modifications.
    // If another request modifies the book between our read and update, the
    // where clause won't match and we retry (up to MAX_RETRIES).
    const MAX_RETRIES = 3
    for (const { bookId, quantityToDeduct } of stockUpdates) {
      let updated = false

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        // Read the freshest stock value
        const freshBook = await payload.findByID({
          collection: 'books',
          id: bookId,
        })

        if (!freshBook) {
          throw new Error(`Book ID ${bookId} not found during stock update`)
        }

        if (freshBook.stockQuantity < quantityToDeduct) {
          throw new Error(
            `Insufficient stock for "${freshBook.title}". Available: ${freshBook.stockQuantity}, Required: ${quantityToDeduct}`,
          )
        }

        const newStock = freshBook.stockQuantity - quantityToDeduct

        // Conditional update: only succeed if the book hasn't been modified since our read.
        // This acts as an optimistic lock — if another checkout changed stock in between,
        // updatedAt will differ and the update returns 0 docs, triggering a retry.
        const result = await payload.update({
          collection: 'books',
          where: {
            id: { equals: bookId },
            updatedAt: { equals: freshBook.updatedAt },
          },
          data: {
            stockQuantity: newStock,
          },
        })

        if (result.docs.length > 0) {
          updated = true
          break
        }
        // Conflict detected — another concurrent update modified this book. Retry.
      }

      if (!updated) {
        throw new Error(
          `Failed to update stock for book ID ${bookId} after ${MAX_RETRIES} attempts due to concurrent modifications. Please try again.`,
        )
      }
    }

    // 8. Create Sale record with SaleItem IDs and initial status
    const now = new Date().toISOString()
    const sale = await payload.create({
      collection: 'sales',
      draft: false,
      data: {
        saleDate: now,
        totalAmount,
        paymentMethod,
        squareTransactionId,
        squareReceiptUrl,
        items: saleItemIds,
        status,
        statusHistory: [
          {
            status,
            timestamp: now,
            note: 'Order created',
          },
        ],
        customer: customerId,
        customerEmail,
        customerName,
      },
    })

    return {
      success: true,
      saleId: sale.id,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create order'
    return {
      success: false,
      error: message,
    }
  }
}
