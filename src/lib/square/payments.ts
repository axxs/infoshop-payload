/**
 * Square Payments API Integration
 * Processes card payments through Square POS
 */

import { getSquareClient, generateIdempotencyKey } from './client'
import type { Payment, CreatePaymentRequest, Currency } from 'square'

/**
 * Maximum payment amount in dollars (prevents accidental large charges)
 */
const MAX_PAYMENT_AMOUNT = 1_000_000

/**
 * Allowed currency codes for payments
 */
const ALLOWED_CURRENCIES: Currency[] = ['AUD', 'USD', 'EUR', 'GBP', 'CAD', 'NZD']

export interface PaymentParams {
  /**
   * Payment amount in dollars (will be converted to cents)
   */
  amount: number

  /**
   * Currency code (default: AUD)
   */
  currency?: Currency

  /**
   * Payment source nonce from Square Web Payments SDK
   */
  sourceId: string

  /**
   * Optional reference ID for tracking
   */
  referenceId?: string

  /**
   * Optional note about the payment
   */
  note?: string

  /**
   * Optional customer ID
   */
  customerId?: string
}

export interface PaymentResult {
  success: boolean
  payment?: Payment
  transactionId?: string
  receiptUrl?: string
  error?: string
}

/**
 * Convert dollars to cents with proper precision handling
 */
function convertDollarsToCents(dollars: number): bigint {
  // Use toFixed to avoid floating point precision issues
  const cents = Number((dollars * 100).toFixed(0))
  return BigInt(cents)
}

/**
 * Process a payment using Square Payments API
 */
export async function processPayment(params: PaymentParams): Promise<PaymentResult> {
  // Validate amount is positive
  if (params.amount <= 0) {
    return { success: false, error: 'Amount must be positive' }
  }

  // Validate amount doesn't exceed maximum
  if (params.amount > MAX_PAYMENT_AMOUNT) {
    return {
      success: false,
      error: `Amount exceeds maximum of $${MAX_PAYMENT_AMOUNT.toLocaleString()}`,
    }
  }

  // Validate sourceId is provided
  if (!params.sourceId || params.sourceId.trim() === '') {
    return { success: false, error: 'Payment source is required' }
  }

  // Validate currency
  const currency = params.currency || 'AUD'
  if (!ALLOWED_CURRENCIES.includes(currency)) {
    return {
      success: false,
      error: `Invalid currency. Allowed: ${ALLOWED_CURRENCIES.join(', ')}`,
    }
  }

  try {
    const client = getSquareClient()
    const paymentsApi = client.payments

    // Convert dollars to cents (Square expects amount in smallest currency unit)
    const amountMoney = {
      amount: convertDollarsToCents(params.amount),
      currency,
    }

    const request: CreatePaymentRequest = {
      sourceId: params.sourceId,
      idempotencyKey: generateIdempotencyKey(),
      amountMoney,
      ...(params.referenceId && { referenceId: params.referenceId }),
      ...(params.note && { note: params.note }),
      ...(params.customerId && { customerId: params.customerId }),
      autocomplete: true, // Auto-complete the payment immediately
    }

    const response = await paymentsApi.create(request)

    if (response.payment) {
      const payment = response.payment

      return {
        success: true,
        payment,
        transactionId: payment.id,
        receiptUrl: payment.receiptUrl,
      }
    }

    return {
      success: false,
      error: 'Payment response did not include payment object',
    }
  } catch (error) {
    // Extract error message from Square API error
    let errorMessage = 'An unknown error occurred'

    if (error && typeof error === 'object' && 'errors' in error) {
      const errors = (error as { errors?: Array<{ detail?: string }> }).errors
      if (errors && errors.length > 0 && errors[0].detail) {
        errorMessage = errors[0].detail
      }
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    // Log error for debugging (server-side only)
    if (typeof window === 'undefined') {
      console.error('Square payment processing failed:', {
        amount: params.amount,
        currency: params.currency || 'AUD',
        error: errorMessage,
      })
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Retrieve payment details by payment ID
 */
export async function getPayment(paymentId: string): Promise<Payment | null> {
  try {
    const client = getSquareClient()
    const paymentsApi = client.payments

    const response = await paymentsApi.get({ paymentId })

    return response.payment || null
  } catch (error) {
    // Log error for debugging (server-side only)
    if (typeof window === 'undefined') {
      console.error('Failed to retrieve payment:', {
        paymentId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
    return null
  }
}

/**
 * Cancel/void a payment (if not yet completed)
 */
export async function cancelPayment(paymentId: string): Promise<boolean> {
  try {
    const client = getSquareClient()
    const paymentsApi = client.payments

    await paymentsApi.cancel({ paymentId })
    return true
  } catch (error) {
    // Log error for debugging (server-side only)
    if (typeof window === 'undefined') {
      console.error('Failed to cancel payment:', {
        paymentId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
    return false
  }
}

/**
 * Refund a payment
 */
export async function refundPayment(
  paymentId: string,
  amountInDollars: number,
  reason?: string,
): Promise<PaymentResult> {
  try {
    const client = getSquareClient()
    const refundsApi = client.refunds

    // Get original payment to retrieve its currency
    const originalPayment = await getPayment(paymentId)
    if (!originalPayment) {
      return { success: false, error: 'Payment not found' }
    }

    const currency = (originalPayment.amountMoney?.currency as Currency) || 'AUD'

    const amountMoney = {
      amount: convertDollarsToCents(amountInDollars),
      currency,
    }

    const response = await refundsApi.refundPayment({
      idempotencyKey: generateIdempotencyKey(),
      amountMoney,
      paymentId,
      ...(reason && { reason }),
    })

    if (response.refund) {
      return {
        success: true,
        transactionId: response.refund.id,
      }
    }

    return {
      success: false,
      error: 'Refund response did not include refund object',
    }
  } catch (error) {
    let errorMessage = 'An unknown error occurred'

    if (error && typeof error === 'object' && 'errors' in error) {
      const errors = (error as { errors?: Array<{ detail?: string }> }).errors
      if (errors && errors.length > 0 && errors[0].detail) {
        errorMessage = errors[0].detail
      }
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    // Log error for debugging (server-side only)
    if (typeof window === 'undefined') {
      console.error('Square refund failed:', {
        paymentId,
        amount: amountInDollars,
        error: errorMessage,
      })
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}
