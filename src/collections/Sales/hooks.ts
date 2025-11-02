/**
 * Sales Collection Hooks
 * Handles total calculation, receipt generation, and stock deduction
 */

import type {
  CollectionBeforeChangeHook,
  CollectionAfterChangeHook,
  CollectionBeforeValidateHook,
} from 'payload'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Calculate Total Amount from Sale Items
 * Sums up all line totals from related sale items
 */
export const calculateTotalAmount: CollectionBeforeChangeHook = async ({ data, req }) => {
  if (!data) return data

  // Need items to calculate total
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    data.totalAmount = 0
    return data
  }

  const payload = await getPayload({ config })

  // Fetch all sale items to get their line totals
  let totalAmount = 0

  for (const itemId of data.items) {
    const saleItem = await payload.findByID({
      collection: 'sale-items',
      id: typeof itemId === 'string' ? itemId : itemId.id,
    })

    totalAmount += saleItem.lineTotal ?? 0
  }

  data.totalAmount = totalAmount

  return data
}

/**
 * Generate Receipt Number
 * Creates unique receipt number: RCPT-YYYYMMDD-XXXX
 */
export const generateReceiptNumber: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (!data) return data

  // Only generate on create, or if missing
  if (operation !== 'create' && data.receiptNumber) {
    return data
  }

  const payload = await getPayload({ config })

  // Get current date for receipt number
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD

  // Find highest receipt number for today
  const todayReceipts = await payload.find({
    collection: 'sales',
    where: {
      receiptNumber: {
        like: `RCPT-${dateStr}-%`,
      },
    },
    limit: 1,
    sort: '-receiptNumber',
  })

  let sequence = 1
  if (todayReceipts.docs.length > 0) {
    const lastReceipt = todayReceipts.docs[0].receiptNumber
    if (lastReceipt) {
      const lastSequence = parseInt(lastReceipt.split('-').pop() || '0', 10)
      sequence = lastSequence + 1
    }
  }

  // Format: RCPT-20251102-0001
  data.receiptNumber = `RCPT-${dateStr}-${sequence.toString().padStart(4, '0')}`

  return data
}

/**
 * Deduct Stock After Sale
 * Reduces book stock quantities when sale is created/updated
 */
export const deductStock: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  // Only deduct stock on create (not on updates to avoid double-deduction)
  if (operation !== 'create') {
    return doc
  }

  if (!doc.items || !Array.isArray(doc.items) || doc.items.length === 0) {
    return doc
  }

  const payload = await getPayload({ config })

  console.info(`Deducting stock for sale ${doc.receiptNumber}`)

  for (const itemId of doc.items) {
    try {
      // Fetch sale item to get book and quantity
      const saleItem = await payload.findByID({
        collection: 'sale-items',
        id: typeof itemId === 'string' ? itemId : itemId.id,
      })

      const bookId =
        typeof saleItem.book === 'string' || typeof saleItem.book === 'number'
          ? String(saleItem.book)
          : String(saleItem.book.id)
      const quantity = saleItem.quantity ?? 0

      // Fetch book current stock
      const book = await payload.findByID({
        collection: 'books',
        id: bookId,
      })

      // Skip stock deduction for digital products
      if (book.isDigital) {
        continue
      }

      const currentStock = book.stockQuantity ?? 0
      const newStock = Math.max(0, currentStock - quantity)

      // Update book stock
      await payload.update({
        collection: 'books',
        id: bookId,
        data: {
          stockQuantity: newStock,
        },
      })

      console.info(`Stock deducted: "${book.title}" ${currentStock} → ${newStock}`)
    } catch (error) {
      console.error('Failed to deduct stock for sale item', {
        saleItemId: itemId,
        error,
      })
      // Don't throw - allow sale to complete even if stock update fails
      // This prevents blocking sales due to stock sync issues
    }
  }

  return doc
}

/**
 * Validate Sale Items Exist
 * Ensures sale has at least one item before saving
 */
export const validateSaleItems: CollectionBeforeValidateHook = async ({ data }) => {
  if (!data) return

  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('Sale must have at least one item')
  }
}
