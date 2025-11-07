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
 *
 * @param data - Sale data being created/updated
 * @param req - Payload request object
 * @returns Updated sale data with calculated totalAmount
 */
export const calculateTotalAmount: CollectionBeforeChangeHook = async ({ data, req: _req }) => {
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
    // Handle item ID as number, string, or object with id
    let saleItemId: number | string
    if (typeof itemId === 'number' || typeof itemId === 'string') {
      saleItemId = itemId
    } else {
      saleItemId = itemId.id
    }

    const saleItem = await payload.findByID({
      collection: 'sale-items',
      id: saleItemId,
    })

    totalAmount += saleItem.lineTotal ?? 0
  }

  data.totalAmount = totalAmount

  return data
}

/**
 * Generate Receipt Number
 * Creates unique receipt number: RCPT-YYYYMMDD-XXXX
 * Format: RCPT-20251102-0001 (sequential per day)
 *
 * @param data - Sale data being created/updated
 * @param operation - Type of operation (create/update)
 * @param req - Payload request object
 * @returns Updated sale data with generated receiptNumber
 */
export const generateReceiptNumber: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req: _req,
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
 * Reduces book stock quantities when sale is created
 * Only runs on create operation to prevent double-deduction
 *
 * Note: Current implementation has a race condition risk between
 * SaleItem validation and stock deduction. For production use,
 * consider implementing:
 * - Pessimistic locking (reserve stock when SaleItem is created)
 * - Database transactions for atomicity
 * - Two-phase commit pattern
 *
 * @param doc - Created sale document
 * @param operation - Type of operation (only runs on 'create')
 * @param req - Payload request object with logger
 * @returns Sale document (unchanged)
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

  req.payload.logger.info(`Deducting stock for sale ${doc.receiptNumber}`)

  for (const itemId of doc.items) {
    try {
      // Handle item ID as number, string, or object with id
      let saleItemId: number | string
      if (typeof itemId === 'number' || typeof itemId === 'string') {
        saleItemId = itemId
      } else {
        saleItemId = itemId.id
      }

      // Fetch sale item to get book and quantity
      const saleItem = await payload.findByID({
        collection: 'sale-items',
        id: saleItemId,
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

      req.payload.logger.info(`Stock deducted: "${book.title}" ${currentStock} → ${newStock}`)
    } catch (error) {
      req.payload.logger.error(
        `Failed to deduct stock for sale item ${typeof itemId === 'string' ? itemId : itemId.id}: ${error instanceof Error ? error.message : String(error)}`,
      )
      // Don't throw - allow sale to complete even if stock update fails
      // This prevents blocking sales due to stock sync issues
    }
  }

  return doc
}

/**
 * Validate Sale Items Exist
 * Ensures sale has at least one item before saving
 *
 * @param data - Sale data to validate
 * @throws Error if sale has no items
 */
export const validateSaleItems: CollectionBeforeValidateHook = async ({ data }) => {
  if (!data) return

  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('Sale must have at least one item')
  }
}
