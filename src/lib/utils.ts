import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format price with currency symbol
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
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
