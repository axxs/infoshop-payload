/**
 * ISBN Validation and Formatting Utilities
 *
 * Supports both ISBN-10 and ISBN-13 formats
 */

/**
 * Clean ISBN string by removing hyphens, spaces, and converting to uppercase
 */
export function cleanISBN(isbn: string): string {
  return isbn.replace(/[-\s]/g, '').toUpperCase()
}

/**
 * Validate ISBN-10 checksum
 */
function validateISBN10(isbn: string): boolean {
  if (isbn.length !== 10) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    const digit = parseInt(isbn[i], 10)
    if (isNaN(digit)) return false
    sum += digit * (10 - i)
  }

  const checkChar = isbn[9]
  const checkDigit = checkChar === 'X' ? 10 : parseInt(checkChar, 10)
  if (isNaN(checkDigit)) return false

  sum += checkDigit
  return sum % 11 === 0
}

/**
 * Validate ISBN-13 checksum
 */
function validateISBN13(isbn: string): boolean {
  if (isbn.length !== 13) return false

  let sum = 0
  for (let i = 0; i < 13; i++) {
    const digit = parseInt(isbn[i], 10)
    if (isNaN(digit)) return false
    sum += digit * (i % 2 === 0 ? 1 : 3)
  }

  return sum % 10 === 0
}

/**
 * Validate ISBN (supports both ISBN-10 and ISBN-13)
 */
export function validateISBN(isbn: string): {
  valid: boolean
  type: 'ISBN-10' | 'ISBN-13' | null
  cleaned: string
  error?: string
} {
  const cleaned = cleanISBN(isbn)

  if (cleaned.length === 10) {
    const valid = validateISBN10(cleaned)
    return {
      valid,
      type: valid ? 'ISBN-10' : null,
      cleaned,
      error: valid ? undefined : 'Invalid ISBN-10 checksum',
    }
  }

  if (cleaned.length === 13) {
    const valid = validateISBN13(cleaned)
    return {
      valid,
      type: valid ? 'ISBN-13' : null,
      cleaned,
      error: valid ? undefined : 'Invalid ISBN-13 checksum',
    }
  }

  return {
    valid: false,
    type: null,
    cleaned,
    error: `Invalid ISBN length: ${cleaned.length}. Expected 10 or 13 digits.`,
  }
}

/**
 * Convert ISBN-10 to ISBN-13
 */
export function convertISBN10to13(isbn10: string): string | null {
  const cleaned = cleanISBN(isbn10)
  if (cleaned.length !== 10) return null

  // Remove check digit and prepend 978
  const base = '978' + cleaned.substring(0, 9)

  // Calculate new check digit
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base[i], 10) * (i % 2 === 0 ? 1 : 3)
  }
  const checkDigit = (10 - (sum % 10)) % 10

  return base + checkDigit
}

/**
 * Format ISBN with hyphens for display
 * Note: Proper formatting requires publisher prefix lookup, this is a simplified version
 */
export function formatISBN(isbn: string): string {
  const cleaned = cleanISBN(isbn)

  if (cleaned.length === 10) {
    // Simple ISBN-10 formatting: X-XXXX-XXXX-X
    return `${cleaned.slice(0, 1)}-${cleaned.slice(1, 5)}-${cleaned.slice(5, 9)}-${cleaned.slice(9)}`
  }

  if (cleaned.length === 13) {
    // Simple ISBN-13 formatting: XXX-X-XXXX-XXXX-X
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12)}`
  }

  return cleaned
}
