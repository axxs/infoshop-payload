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
  const { cart, squareTransactionId, squareReceiptUrl, paymentMethod } = params

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

    // 7. IMPROVED: Atomic stock updates with just-in-time re-fetch
    // Re-fetch current stock immediately before update to minimize race condition window
    // Combined with beforeChange hook validation (prevents negative stock), this provides strong protection
    await Promise.all(
      stockUpdates.map(async ({ bookId, quantityToDeduct }) => {
        // Re-fetch book to get absolute latest stock quantity
        const freshBook = await payload.findByID({
          collection: 'books',
          id: bookId,
        })

        if (!freshBook) {
          throw new Error(`Book ID ${bookId} not found during stock update`)
        }

        // Final stock check with fresh data (critical for race condition prevention)
        if (freshBook.stockQuantity < quantityToDeduct) {
          throw new Error(
            `Insufficient stock for "${freshBook.title}". Available: ${freshBook.stockQuantity}, Required: ${quantityToDeduct}`,
          )
        }

        const newStock = freshBook.stockQuantity - quantityToDeduct

        // Update will be validated by beforeChange hook (prevents negative stock)
        return payload.update({
          collection: 'books',
          id: bookId,
          data: {
            stockQuantity: newStock,
          },
        })
      }),
    )

    // 8. Create Sale record with SaleItem IDs
    const sale = await payload.create({
      collection: 'sales',
      draft: false,
      data: {
        saleDate: new Date().toISOString(),
        totalAmount,
        paymentMethod,
        squareTransactionId,
        squareReceiptUrl,
        items: saleItemIds,
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
