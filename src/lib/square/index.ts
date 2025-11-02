/**
 * Square Integration Library
 * Exports all Square-related functionality
 */

export { getSquareClient, generateIdempotencyKey } from './client'
export {
  pushBooksToSquare,
  syncUnsyncedBooks,
  syncModifiedBooks,
  type SquareSyncResult,
} from './catalogSync'
export {
  processPayment,
  refundPayment,
  getPayment,
  cancelPayment,
  type PaymentParams,
  type PaymentResult,
} from './payments'
