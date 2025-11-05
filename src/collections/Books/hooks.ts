/**
 * Books Collection Hooks
 * Business logic for inventory management, pricing validation, and stock control
 */

import type { CollectionBeforeChangeHook, CollectionAfterChangeHook } from 'payload'

/**
 * Validate ISBN format (ISBN-10 or ISBN-13)
 */
function validateISBN(isbn: string | null | undefined): boolean {
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

  // Warn if selling below cost (allow but warn)
  if (sellPrice < costPrice) {
    req.payload.logger.warn({
      msg: 'Book price below cost - negative margin',
      book: data.title || 'Unknown',
      sellPrice,
      costPrice,
      margin: sellPrice - costPrice,
    })
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
export const calculateStockStatus: CollectionBeforeChangeHook = async ({ data }) => {
  if (!data) return data

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
    // TODO: Send email notification to admin
    // TODO: Create notification in admin dashboard
  }

  if (quantity === 0) {
    req.payload.logger.error({
      msg: 'Out of stock',
      book: doc.title,
      isbn: doc.isbn || 'N/A',
      bookId: doc.id,
    })
    // TODO: Send urgent notification
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
