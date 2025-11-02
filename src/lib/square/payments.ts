/**
 * Square Payments API Integration
 * Processes card payments through Square POS
 */

import { getSquareClient, generateIdempotencyKey } from './client'
import type { Payment, CreatePaymentRequest, Currency } from 'square'

export interface PaymentParams {
  /**
   * Payment amount in dollars (will be converted to cents)
   */
  amount: number

  /**
   * Currency code (default: USD)
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
 * Process a payment using Square Payments API
 */
export async function processPayment(params: PaymentParams): Promise<PaymentResult> {
  try {
    const client = getSquareClient()
    const paymentsApi = client.payments

    // Convert dollars to cents (Square expects amount in smallest currency unit)
    const amountMoney = {
      amount: BigInt(Math.round(params.amount * 100)),
      currency: params.currency || 'USD',
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
  } catch (error) {
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

    const amountMoney = {
      amount: BigInt(Math.round(amountInDollars * 100)),
      currency: 'USD' as Currency,
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
