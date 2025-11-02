/**
 * SaleItem Collection Hooks
 * Handles line total calculation and stock availability validation
 */

import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook } from 'payload'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Calculate Line Total
 * lineTotal = (quantity × unitPrice) - discount
 */
export const calculateLineTotal: CollectionBeforeChangeHook = async ({ data }) => {
  if (!data) return data

  const quantity = data.quantity ?? 1
  const unitPrice = data.unitPrice ?? 0
  const discount = data.discount ?? 0

  data.lineTotal = quantity * unitPrice - discount

  // Ensure lineTotal is not negative
  if (data.lineTotal < 0) {
    throw new Error(
      `Line total cannot be negative. Check discount amount (${discount}) vs subtotal (${quantity * unitPrice})`,
    )
  }

  return data
}

/**
 * Validate Stock Availability
 * Ensures book has sufficient stock before allowing sale
 */
export const validateStockAvailability: CollectionBeforeValidateHook = async ({ data }) => {
  if (!data) return

  // Skip validation if no book or quantity specified
  if (!data.book || !data.quantity) {
    return
  }

  const payload = await getPayload({ config })

  // Fetch book to check stock
  const book = await payload.findByID({
    collection: 'books',
    id: typeof data.book === 'string' ? data.book : data.book.id,
  })

  // Skip stock check for digital products
  if (book.isDigital) {
    return
  }

  // Check if sufficient stock available
  const requestedQuantity = data.quantity
  const availableStock = book.stockQuantity ?? 0

  if (availableStock < requestedQuantity) {
    throw new Error(
      `Insufficient stock for "${book.title}". Available: ${availableStock}, Requested: ${requestedQuantity}`,
    )
  }

  // Warn if this sale would put stock below reorder level
  const stockAfterSale = availableStock - requestedQuantity
  const reorderLevel = book.reorderLevel ?? 5

  if (stockAfterSale <= reorderLevel && stockAfterSale > 0) {
    console.warn(`⚠️  LOW STOCK WARNING: "${book.title}" will be at ${stockAfterSale} after sale`, {
      bookId: book.id,
      stockAfterSale,
      reorderLevel,
    })
  }
}

/**
 * Set Unit Price from Book
 * Auto-populate unitPrice based on priceType if not provided
 */
export const setUnitPriceFromBook: CollectionBeforeChangeHook = async ({ data, operation }) => {
  if (!data) return data

  // Only auto-set on create, or if unitPrice is missing
  if (operation !== 'create' && data.unitPrice !== undefined) {
    return data
  }

  // If unitPrice already set, don't override
  if (data.unitPrice !== undefined && data.unitPrice !== null) {
    return data
  }

  // Need book and priceType to determine price
  if (!data.book || !data.priceType) {
    return data
  }

  const payload = await getPayload({ config })

  const book = await payload.findByID({
    collection: 'books',
    id: typeof data.book === 'string' ? data.book : data.book.id,
  })

  // Set price based on type
  switch (data.priceType) {
    case 'RETAIL':
      data.unitPrice = book.sellPrice
      break
    case 'MEMBER':
      data.unitPrice = book.memberPrice
      break
    case 'CUSTOM':
      // For custom price, require it to be set manually
      if (data.unitPrice === undefined || data.unitPrice === null) {
        throw new Error('Custom price type requires manual unitPrice')
      }
      break
    default:
      data.unitPrice = book.sellPrice
  }

  return data
}
