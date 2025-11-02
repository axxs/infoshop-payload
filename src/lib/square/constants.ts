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
 * Default currency for payments
 * Note: Square supports 100+ currencies. Currency validation is handled by Square API.
 */
export const DEFAULT_CURRENCY: Currency = 'AUD'
