/**
 * Order Creation Logic
 * Creates Sale and SaleItem records after successful payment
 */

'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import type { PopulatedCart } from '../cart/types'

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
}

/**
 * Create Sale record and update stock quantities
 */
export async function createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const { cart, squareTransactionId, squareReceiptUrl, paymentMethod } = params

  try {
    const payload = await getPayload({ config })

    // Calculate total (including tax if applicable)
    const taxRate = cart.currency === 'AUD' ? 0.1 : 0
    const tax = cart.subtotal * taxRate
    const totalAmount = cart.subtotal + tax

    // Create SaleItem records first
    const saleItemIds: number[] = []

    for (const item of cart.items) {
      // Create sale item
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

      // Update book stock quantity
      const currentBook = await payload.findByID({
        collection: 'books',
        id: item.bookId,
      })

      const newStockQuantity = currentBook.stockQuantity - item.quantity

      await payload.update({
        collection: 'books',
        id: item.bookId,
        data: {
          stockQuantity: Math.max(0, newStockQuantity),
        },
      })
    }

    // Create Sale record with SaleItem IDs
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
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create order'
    return {
      success: false,
      error: message,
    }
  }
}
