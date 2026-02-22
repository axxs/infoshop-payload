/**
 * CSV Import Validator
 * Validates book operations according to business rules
 *
 * @module csv/validator
 */

import type { BookOperation, ValidationIssue } from './types'
import { ValidationSeverity, ValidationCode } from './types'

/**
 * Valid currency codes
 */
/**
 * Valid currency codes - must match the Books collection schema options
 * @see src/collections/Books.ts currency field
 */
const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD']

/**
 * Valid stock status values
 */
const VALID_STOCK_STATUSES = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED']

/**
 * Validates ISBN-10 checksum using modulo 11 algorithm
 *
 * @param isbn - Cleaned 10-character ISBN string
 * @returns True if checksum is valid
 */
function validateISBN10Checksum(isbn: string): boolean {
  let sum = 0

  // Calculate weighted sum of first 9 digits
  for (let i = 0; i < 9; i++) {
    const digit = parseInt(isbn[i], 10)
    if (isNaN(digit)) return false
    sum += digit * (10 - i)
  }

  // Check digit can be 0-9 or X (representing 10)
  const checkChar = isbn[9]
  const checkDigit = checkChar === 'X' || checkChar === 'x' ? 10 : parseInt(checkChar, 10)

  if (isNaN(checkDigit)) return false

  sum += checkDigit

  // Valid if sum is divisible by 11
  return sum % 11 === 0
}

/**
 * Validates ISBN-13 checksum using modulo 10 algorithm
 *
 * @param isbn - Cleaned 13-digit ISBN string
 * @returns True if checksum is valid
 */
function validateISBN13Checksum(isbn: string): boolean {
  let sum = 0

  // Calculate weighted sum of first 12 digits
  // Alternating weight: 1, 3, 1, 3...
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn[i], 10)
    if (isNaN(digit)) return false

    const weight = i % 2 === 0 ? 1 : 3
    sum += digit * weight
  }

  // Check digit calculation
  const checkDigit = parseInt(isbn[12], 10)
  if (isNaN(checkDigit)) return false

  const calculatedCheck = (10 - (sum % 10)) % 10

  return calculatedCheck === checkDigit
}

/**
 * Validates ISBN format and checksum (10 or 13 digits after cleaning)
 *
 * @param isbn - ISBN string
 * @returns True if valid format and checksum
 */
function validateISBNFormat(isbn: string): boolean {
  const cleaned = isbn.replace(/[-\s]/g, '').toUpperCase()

  // Validate ISBN-10 (9 digits + check character)
  if (/^\d{9}[\dX]$/.test(cleaned)) {
    return validateISBN10Checksum(cleaned)
  }

  // Validate ISBN-13 (13 digits)
  if (/^\d{13}$/.test(cleaned)) {
    return validateISBN13Checksum(cleaned)
  }

  return false
}

/**
 * Validates a single book operation
 *
 * @param operation - Book operation to validate
 * @returns Array of validation issues
 */
export function validateBookOperation(operation: BookOperation): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // 1. Required field: title
  if (!operation.title || operation.title.trim() === '') {
    issues.push({
      severity: ValidationSeverity.ERROR,
      field: 'title',
      message: 'Title is required',
      code: ValidationCode.REQUIRED_FIELD,
      rowIndex: operation.rowIndex,
    })
  }

  // 2. Pricing validation: partial pricing is allowed (books can be imported without prices)
  const hasCostPrice = operation.costPrice !== undefined
  const hasSellPrice = operation.sellPrice !== undefined
  const hasMemberPrice = operation.memberPrice !== undefined

  const pricingFieldsProvided = [hasCostPrice, hasSellPrice, hasMemberPrice].filter(Boolean).length

  // INFO: Partial pricing is now allowed - books can be imported without complete pricing
  // to be priced later. The frontend will show "Price on request" for unpriced books.
  if (pricingFieldsProvided > 0 && pricingFieldsProvided < 3) {
    issues.push({
      severity: ValidationSeverity.INFO,
      field: 'pricing',
      message:
        'Partial pricing provided - book will be imported with available prices only. Consider adding all prices (costPrice, sellPrice, memberPrice) later.',
      code: ValidationCode.INCOMPLETE_PRICING,
      rowIndex: operation.rowIndex,
    })
  }

  // 3. Pricing validation: valid numbers
  if (hasCostPrice && (operation.costPrice! < 0 || isNaN(operation.costPrice!))) {
    issues.push({
      severity: ValidationSeverity.ERROR,
      field: 'costPrice',
      message: 'Cost price must be a valid positive number',
      code: ValidationCode.INVALID_PRICE,
      rowIndex: operation.rowIndex,
    })
  }

  if (hasSellPrice && (operation.sellPrice! < 0 || isNaN(operation.sellPrice!))) {
    issues.push({
      severity: ValidationSeverity.ERROR,
      field: 'sellPrice',
      message: 'Sell price must be a valid positive number',
      code: ValidationCode.INVALID_PRICE,
      rowIndex: operation.rowIndex,
    })
  }

  if (hasMemberPrice && (operation.memberPrice! < 0 || isNaN(operation.memberPrice!))) {
    issues.push({
      severity: ValidationSeverity.ERROR,
      field: 'memberPrice',
      message: 'Member price must be a valid positive number',
      code: ValidationCode.INVALID_PRICE,
      rowIndex: operation.rowIndex,
    })
  }

  // 4. Pricing hierarchy validation
  if (pricingFieldsProvided === 3) {
    // Warn if selling below cost (negative margin)
    if (operation.sellPrice! < operation.costPrice!) {
      issues.push({
        severity: ValidationSeverity.WARNING,
        field: 'sellPrice',
        message: `Sell price (${operation.sellPrice}) is lower than cost price (${operation.costPrice}) - negative margin`,
        code: ValidationCode.NEGATIVE_MARGIN,
        rowIndex: operation.rowIndex,
      })
    }

    // Warn if member price is higher than sell price (invalid discount)
    if (operation.memberPrice! > operation.sellPrice!) {
      issues.push({
        severity: ValidationSeverity.WARNING,
        field: 'memberPrice',
        message: `Member price (${operation.memberPrice}) is higher than sell price (${operation.sellPrice}) - invalid member discount`,
        code: ValidationCode.INVALID_DISCOUNT,
        rowIndex: operation.rowIndex,
      })
    }

    // Error if member price is below cost (selling to members below cost)
    if (operation.memberPrice! < operation.costPrice!) {
      issues.push({
        severity: ValidationSeverity.ERROR,
        field: 'memberPrice',
        message: `Member price (${operation.memberPrice}) cannot be below cost price (${operation.costPrice})`,
        code: ValidationCode.INVALID_DISCOUNT,
        rowIndex: operation.rowIndex,
      })
    }
  }

  // 5. Currency validation
  if (operation.currency && !VALID_CURRENCIES.includes(operation.currency)) {
    issues.push({
      severity: ValidationSeverity.ERROR,
      field: 'currency',
      message: `Invalid currency: ${operation.currency}. Valid options: ${VALID_CURRENCIES.join(', ')}`,
      code: ValidationCode.INVALID_CURRENCY,
      rowIndex: operation.rowIndex,
    })
  }

  // 6. ISBN validation
  if (operation.isbn && !validateISBNFormat(operation.isbn)) {
    issues.push({
      severity: ValidationSeverity.WARNING,
      field: 'isbn',
      message: 'ISBN should be 10 or 13 digits (hyphens allowed)',
      code: ValidationCode.INVALID_ISBN_LENGTH,
      rowIndex: operation.rowIndex,
    })
  }

  // 7. Stock quantity validation
  if (operation.stockQuantity !== undefined && operation.stockQuantity < 0) {
    issues.push({
      severity: ValidationSeverity.ERROR,
      field: 'stockQuantity',
      message: 'Stock quantity cannot be negative',
      code: ValidationCode.INVALID_STOCK,
      rowIndex: operation.rowIndex,
    })
  }

  // 8. Reorder level validation
  if (operation.reorderLevel !== undefined && operation.reorderLevel < 0) {
    issues.push({
      severity: ValidationSeverity.ERROR,
      field: 'reorderLevel',
      message: 'Reorder level cannot be negative',
      code: ValidationCode.NEGATIVE_REORDER_LEVEL,
      rowIndex: operation.rowIndex,
    })
  }

  // 9. Stock status validation
  if (operation.stockStatus && !VALID_STOCK_STATUSES.includes(operation.stockStatus)) {
    issues.push({
      severity: ValidationSeverity.ERROR,
      field: 'stockStatus',
      message: `Invalid stock status: ${operation.stockStatus}. Valid options: ${VALID_STOCK_STATUSES.join(', ')}`,
      code: ValidationCode.INVALID_STOCK,
      rowIndex: operation.rowIndex,
    })
  }

  // 10. Digital product validation
  if (operation.isDigital) {
    // Error if no download URL
    if (!operation.downloadUrl || operation.downloadUrl.trim() === '') {
      issues.push({
        severity: ValidationSeverity.ERROR,
        field: 'downloadUrl',
        message: 'Download URL is required for digital products',
        code: ValidationCode.MISSING_DOWNLOAD_URL,
        rowIndex: operation.rowIndex,
      })
    }

    // Warn if digital product has stock quantity > 0
    if (operation.stockQuantity !== undefined && operation.stockQuantity > 0) {
      issues.push({
        severity: ValidationSeverity.WARNING,
        field: 'stockQuantity',
        message: 'Digital products should have stock quantity of 0 or undefined',
        code: ValidationCode.DIGITAL_WITH_STOCK,
        rowIndex: operation.rowIndex,
      })
    }
  }

  return issues
}

/**
 * Validates multiple book operations
 *
 * @param operations - Array of book operations
 * @returns Array of all validation issues
 */
export function validateBookOperations(operations: BookOperation[]): ValidationIssue[] {
  const allIssues: ValidationIssue[] = []

  for (const operation of operations) {
    const issues = validateBookOperation(operation)
    allIssues.push(...issues)
  }

  return allIssues
}

/**
 * Checks if operation has ERROR-level issues
 *
 * @param issues - Array of validation issues for an operation
 * @returns True if operation is valid (no errors)
 */
export function isOperationValid(issues: ValidationIssue[]): boolean {
  return !issues.some((issue) => issue.severity === ValidationSeverity.ERROR)
}
