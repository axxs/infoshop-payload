import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Map of currency codes to their appropriate locale for formatting
 */
const CURRENCY_LOCALE_MAP: Record<string, string> = {
  AUD: 'en-AU',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
}

/**
 * Format price with currency symbol using the appropriate locale
 */
export function formatPrice(price: number, currency: string = 'AUD'): string {
  const locale = CURRENCY_LOCALE_MAP[currency] || 'en-AU'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(price)
}

/**
 * Get stock status badge color
 */
export function getStockStatusColor(status: string): string {
  switch (status) {
    case 'IN_STOCK':
      return 'green'
    case 'LOW_STOCK':
      return 'yellow'
    case 'OUT_OF_STOCK':
      return 'red'
    case 'DISCONTINUED':
      return 'gray'
    default:
      return 'gray'
  }
}

/**
 * Get stock status label
 */
export function getStockStatusLabel(status: string, quantity?: number): string {
  switch (status) {
    case 'IN_STOCK':
      return 'In Stock'
    case 'LOW_STOCK':
      return quantity ? `Low Stock (${quantity} left)` : 'Low Stock'
    case 'OUT_OF_STOCK':
      return 'Out of Stock'
    case 'DISCONTINUED':
      return 'Discontinued'
    default:
      return 'Unknown'
  }
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/**
 * Sanitizes user search input to prevent injection and ensure safe queries
 *
 * @param input - Raw search input from user
 * @returns Sanitized search string, or null if invalid
 *
 * @example
 * sanitizeSearchInput('Marx & Engels') // 'Marx & Engels'
 * sanitizeSearchInput('  test  ') // 'test'
 * sanitizeSearchInput('<script>alert("xss")</script>') // 'scriptalertxssscript'
 * sanitizeSearchInput('a'.repeat(200)) // null (too long)
 */
export function sanitizeSearchInput(input: string | null | undefined): string | null {
  if (!input) return null

  // Trim whitespace
  let sanitized = input.trim()

  // Check length (max 100 characters)
  if (sanitized.length === 0 || sanitized.length > 100) {
    return null
  }

  // Remove potentially dangerous characters but keep common search characters
  // Allow: letters, numbers, spaces, ampersand, dash, apostrophe, comma, period
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s&\-',\.]/g, '')

  // Collapse multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim()

  return sanitized.length > 0 ? sanitized : null
}
