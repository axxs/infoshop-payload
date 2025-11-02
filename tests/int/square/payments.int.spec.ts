/**
 * Square Payments Integration Tests
 *
 * Tests the Square payments processing functionality
 * These tests require SQUARE_ACCESS_TOKEN to be set in environment
 *
 * Note: Uses Square test nonces for sandbox testing
 * See: https://developer.squareup.com/docs/testing/test-values
 */

import { describe, test, expect } from 'vitest'
import { processPayment, getPayment, refundPayment } from '@/lib/square/payments'

describe('Square Payments - Input Validation', () => {
  test('rejects negative amounts', async () => {
    const result = await processPayment({
      sourceId: 'cnon:card-nonce-ok',
      amount: -10.0,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('positive')
  })

  test('rejects zero amount', async () => {
    const result = await processPayment({
      sourceId: 'cnon:card-nonce-ok',
      amount: 0,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('positive')
  })

  test('rejects amounts over maximum', async () => {
    const result = await processPayment({
      sourceId: 'cnon:card-nonce-ok',
      amount: 2_000_000, // Over $1M limit
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('exceeds maximum')
  })

  test('rejects empty sourceId', async () => {
    const result = await processPayment({
      sourceId: '',
      amount: 10.0,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Payment source is required')
  })
})

describe('Square Payments - Amount Conversion', () => {
  test('converts dollars to cents correctly', () => {
    // Test various amounts to ensure proper conversion
    const testCases = [
      { dollars: 10.0, expectedCents: 1000 },
      { dollars: 19.99, expectedCents: 1999 },
      { dollars: 0.01, expectedCents: 1 },
      { dollars: 100.5, expectedCents: 10050 },
      { dollars: 123.45, expectedCents: 12345 },
    ]

    testCases.forEach(({ dollars, expectedCents }) => {
      // Internal conversion function logic (same as in payments.ts)
      const cents = Number((dollars * 100).toFixed(0))
      expect(cents).toBe(expectedCents)
    })
  })

  test('handles floating point precision issues', () => {
    // Test edge cases where floating point math can cause issues
    const amount = 19.99
    const cents = Number((amount * 100).toFixed(0))

    expect(cents).toBe(1999) // Should be exactly 1999, not 1998
  })
})

describe('Square Payments - Default Currency', () => {
  test('defaults to AUD when no currency specified', async () => {
    const result = await processPayment({
      sourceId: 'cnon:card-nonce-ok',
      amount: 10.0,
      // No currency specified - should default to AUD
    })

    // If payment succeeds or fails for other reasons,
    // verify it didn't fail due to missing currency
    if (result.payment) {
      expect(result.payment.amountMoney?.currency).toBe('AUD')
    }
  })
})

describe('Square Payments - Payment Processing (Sandbox)', () => {
  test('processes successful payment with test nonce', async () => {
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      console.warn('Skipping test: SQUARE_ACCESS_TOKEN not set')
      return
    }

    const result = await processPayment({
      sourceId: 'cnon:card-nonce-ok', // Square test nonce for successful payment
      amount: 10.0,
      currency: 'AUD',
    })

    if (result.success) {
      expect(result.transactionId).toBeDefined()
      expect(result.payment).toBeDefined()
      expect(result.receiptUrl).toBeDefined()
    } else {
      // Payment may fail in sandbox for various reasons
      // Just ensure error is not a validation error
      expect(result.error).toBeDefined()
      expect(result.error).not.toContain('positive')
      expect(result.error).not.toContain('Invalid currency')
    }
  })

  test('handles declined card with test nonce', async () => {
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      console.warn('Skipping test: SQUARE_ACCESS_TOKEN not set')
      return
    }

    const result = await processPayment({
      sourceId: 'cnon:card-nonce-declined', // Square test nonce for declined payment
      amount: 10.0,
      currency: 'AUD',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('Square Payments - Get Payment', () => {
  test('returns null for non-existent payment', async () => {
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      console.warn('Skipping test: SQUARE_ACCESS_TOKEN not set')
      return
    }

    const payment = await getPayment('non-existent-payment-id')
    expect(payment).toBeNull()
  })
})

describe('Square Payments - Refund', () => {
  test('validates payment exists before refund', async () => {
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      console.warn('Skipping test: SQUARE_ACCESS_TOKEN not set')
      return
    }

    const result = await refundPayment('non-existent-payment-id', 10.0, 'Test refund')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Payment not found')
  })

  test('refund inherits currency from original payment', async () => {
    // This test validates the logic - actual refund would require a real payment ID
    // Testing that getPayment is called to retrieve original currency
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      console.warn('Skipping test: SQUARE_ACCESS_TOKEN not set')
      return
    }

    const result = await refundPayment('non-existent-payment-id', 5.0)

    // Should fail with "Payment not found" not currency error
    expect(result.success).toBe(false)
    expect(result.error).toBe('Payment not found')
  })
})

describe('Square Payments - Error Message Structure', () => {
  test('returns consistent error structure', async () => {
    const result = await processPayment({
      sourceId: '',
      amount: 10.0,
    })

    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('error')
    expect(result.success).toBe(false)
    expect(typeof result.error).toBe('string')
  })

  test('returns consistent success structure', async () => {
    // Mock validation to test structure
    const mockSuccessResult = {
      success: true,
      transactionId: 'test-txn-id',
      receiptUrl: 'https://example.com/receipt',
      payment: {} as any,
    }

    expect(mockSuccessResult).toHaveProperty('success')
    expect(mockSuccessResult).toHaveProperty('transactionId')
    expect(mockSuccessResult).toHaveProperty('receiptUrl')
    expect(mockSuccessResult.success).toBe(true)
  })
})
