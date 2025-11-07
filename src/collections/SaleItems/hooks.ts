/**
 * SaleItem Collection Hooks
 * Handles line total calculation and stock availability validation
 */

import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook } from 'payload'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Calculate Line Total
 * Formula: lineTotal = (quantity × unitPrice) - discount
 * Ensures line total is never negative
 *
 * @param data - SaleItem data being created/updated
 * @returns Updated sale item data with calculated lineTotal
 * @throws Error if calculated line total is negative
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
 * Skips validation for digital products
 *
 * Note: This validation runs before stock deduction, creating a potential
 * race condition window. See Sales/hooks.ts deductStock for details.
 *
 * @param data - SaleItem data to validate
 * @throws Error if insufficient stock available for physical products
 */
export const validateStockAvailability: CollectionBeforeValidateHook = async ({ data }) => {
  if (!data) return

  // Skip validation if no book or quantity specified
  if (!data.book || !data.quantity) {
    return
  }

  const payload = await getPayload({ config })

  // Fetch book to check stock
  // Handle book as number, string, or object with id
  let bookId: number | string
  if (typeof data.book === 'number' || typeof data.book === 'string') {
    bookId = data.book
  } else {
    bookId = data.book.id
  }

  const book = await payload.findByID({
    collection: 'books',
    id: bookId,
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

  // Note: Low stock warnings are now logged in Sales afterChange hook
  // where we have access to proper logging infrastructure
}

/**
 * Set Unit Price from Book
 * Auto-populate unitPrice based on priceType if not provided
 * Only runs on create operation or when unitPrice is missing
 *
 * Pricing rules:
 * - RETAIL: Uses book.sellPrice
 * - MEMBER: Uses book.memberPrice
 * - CUSTOM: Requires manual unitPrice (throws if missing)
 *
 * @param data - SaleItem data being created/updated
 * @param operation - Type of operation (create/update)
 * @returns Updated sale item data with unitPrice set from book
 * @throws Error if CUSTOM price type is used without manual unitPrice
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

  // Handle book as number, string, or object with id
  let bookId: number | string
  if (typeof data.book === 'number' || typeof data.book === 'string') {
    bookId = data.book
  } else {
    bookId = data.book.id
  }

  const book = await payload.findByID({
    collection: 'books',
    id: bookId,
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
