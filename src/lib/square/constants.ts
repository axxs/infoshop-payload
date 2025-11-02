/**
 * Square Integration Constants
 * Shared constants used across Square payment and catalog functionality
 */

import type { Currency } from 'square'

/**
 * Maximum payment amount in dollars (prevents accidental large charges)
 */
export const MAX_PAYMENT_AMOUNT = 1_000_000

/**
 * Allowed currency codes for Square payments
 * Supported: Australian Dollar, US Dollar, Euro, British Pound, Canadian Dollar, New Zealand Dollar
 */
export const ALLOWED_CURRENCIES: readonly Currency[] = [
  'AUD',
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'NZD',
] as const

/**
 * Default currency for payments
 */
export const DEFAULT_CURRENCY: Currency = 'AUD'
