/**
 * Square Payment Verification
 * Verifies payment authenticity and prevents fraud
 */

import { getSquareClient } from './client'
import { getPayload } from 'payload'
import config from '@payload-config'

export interface PaymentVerificationResult {
  valid: boolean
  error?: string
  amountMoney?: {
    amount: bigint
    currency: string
  }
  receiptUrl?: string
  status?: string
}

/**
 * Verify a Square payment is valid and not already used
 *
 * Security checks:
 * 1. Payment has not been used for another order
 * 2. Payment exists in Square
 * 3. Payment status is COMPLETED
 * 4. Payment amount matches expected amount (prevents amount manipulation)
 * 5. Payment currency matches expected currency
 */
export async function verifySquarePayment(
  paymentId: string,
  expectedAmount: number,
  expectedCurrency: string,
): Promise<PaymentVerificationResult> {
  try {
    const client = getSquareClient()
    const payload = await getPayload({ config })

    // 1. Check if payment already used in another order (prevent reuse)
    const { docs: existingSales } = await payload.find({
      collection: 'sales',
      where: {
        squareTransactionId: {
          equals: paymentId,
        },
      },
      limit: 1,
    })

    if (existingSales.length > 0) {
      return {
        valid: false,
        error: 'Payment has already been used for another order',
      }
    }

    // 2. Retrieve payment from Square
    const paymentsApi = client.payments
    const response = await paymentsApi.get({ paymentId })

    if (!response || !response.payment) {
      return {
        valid: false,
        error: 'Payment not found in Square',
      }
    }

    const payment = response.payment

    // 3. Check payment status
    if (payment.status !== 'COMPLETED') {
      return {
        valid: false,
        error: `Payment status is ${payment.status}, expected COMPLETED`,
        status: payment.status,
      }
    }

    // 4. Verify amount matches (convert to smallest currency unit - cents)
    const expectedAmountInCents = Math.round(expectedAmount * 100)
    const actualAmountInCents = payment.amountMoney?.amount

    if (!actualAmountInCents) {
      return {
        valid: false,
        error: 'Payment amount not found',
      }
    }

    // Convert BigInt to number for comparison
    const actualAmount = Number(actualAmountInCents)

    if (actualAmount !== expectedAmountInCents) {
      return {
        valid: false,
        error: `Payment amount mismatch. Expected: ${expectedAmountInCents} cents, Got: ${actualAmount} cents`,
      }
    }

    // 5. Verify currency matches
    const actualCurrency = payment.amountMoney?.currency || ''

    if (actualCurrency !== expectedCurrency) {
      return {
        valid: false,
        error: `Currency mismatch. Expected: ${expectedCurrency}, Got: ${actualCurrency}`,
      }
    }

    // Payment is valid
    return {
      valid: true,
      amountMoney: {
        amount: actualAmountInCents,
        currency: actualCurrency,
      },
      receiptUrl: payment.receiptUrl,
      status: payment.status,
    }
  } catch (error) {
    // Log error but don't expose internal details to client
    console.error('Payment verification error:', error)

    return {
      valid: false,
      error: 'Failed to verify payment with Square',
    }
  }
}
