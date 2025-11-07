/**
 * Square Integration Constants
 * Shared constants used across Square payment and catalog functionality
 */

import type { Currency } from 'square'

/**
 * Supported currencies for the application
 * Note: Square supports 100+ currencies, but we limit to these for consistency
 */
export type SupportedCurrency = 'AUD' | 'USD' | 'EUR' | 'GBP'

/**
 * Maximum payment amount in dollars (prevents accidental large charges)
 */
export const MAX_PAYMENT_AMOUNT = 1_000_000

/**
 * Default currency for payments
 * Note: Square API validates currency codes at runtime
 */
export const DEFAULT_CURRENCY: SupportedCurrency = 'AUD'

/**
 * Square application ID prefix for sandbox environment
 */
export const SQUARE_SANDBOX_PREFIX = 'sandbox-'

/**
 * Square Web Payments SDK URLs
 */
export const SQUARE_SDK_URL = {
  PRODUCTION: 'https://web.squarecdn.com/v1/square.js',
  SANDBOX: 'https://sandbox.web.squarecdn.com/v1/square.js',
} as const
