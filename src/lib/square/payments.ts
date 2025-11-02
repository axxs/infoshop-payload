/**
 * Square Payments API Integration
 * Processes card payments through Square POS
 */

import { getSquareClient, generateIdempotencyKey } from './client'
import type { Payment, CreatePaymentRequest, Currency } from 'square'
import { MAX_PAYMENT_AMOUNT, ALLOWED_CURRENCIES, DEFAULT_CURRENCY } from './constants'

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
  const currency = params.currency || DEFAULT_CURRENCY
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
  } catch (_error) {
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
  } catch (_error) {
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
  // Validate refund amount is positive
  if (amountInDollars <= 0) {
    return { success: false, error: 'Refund amount must be positive' }
  }

  try {
    const client = getSquareClient()
    const refundsApi = client.refunds

    // Get original payment to retrieve its currency and validate amount
    const originalPayment = await getPayment(paymentId)
    if (!originalPayment) {
      return { success: false, error: 'Payment not found' }
    }

    // Validate refund doesn't exceed original payment amount
    const originalAmountCents = Number(originalPayment.amountMoney?.amount || 0)
    const originalAmountDollars = originalAmountCents / 100
    if (amountInDollars > originalAmountDollars) {
      return {
        success: false,
        error: `Refund amount ($${amountInDollars}) exceeds original payment amount ($${originalAmountDollars.toFixed(2)})`,
      }
    }

    const currency = (originalPayment.amountMoney?.currency as Currency) || DEFAULT_CURRENCY

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

    return {
      success: false,
      error: errorMessage,
    }
  }
}
