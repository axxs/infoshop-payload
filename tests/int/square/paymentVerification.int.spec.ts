/**
 * Square Payment Verification Tests
 *
 * Tests the payment verification logic including:
 * - Payment reuse prevention
 * - Amount tampering detection
 * - Currency mismatch detection
 * - Status validation
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'

const mockPaymentsApi = {
  get: vi.fn(),
}

const mockPayload = {
  find: vi.fn(),
}

// Must be before imports that use these modules
vi.mock('@payload-config', () => ({ default: {} }))

vi.mock('@/lib/square/client', () => ({
  getSquareClient: () => ({ payments: mockPaymentsApi }),
}))

vi.mock('payload', () => ({
  getPayload: () => Promise.resolve(mockPayload),
}))

import { verifySquarePayment } from '@/lib/square/paymentVerification'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Payment Verification - Reuse Prevention', () => {
  test('rejects payment that has already been used for another order', async () => {
    mockPayload.find.mockResolvedValue({
      docs: [{ id: 1, squareTransactionId: 'pay_existing' }],
    })

    const result = await verifySquarePayment('pay_existing', 25.0, 'AUD')

    expect(result.valid).toBe(false)
    expect(result.error).toContain('already been used')
    // Should NOT call Square API if payment is already used
    expect(mockPaymentsApi.get).not.toHaveBeenCalled()
  })

  test('allows payment that has not been used before', async () => {
    mockPayload.find.mockResolvedValue({ docs: [] })
    mockPaymentsApi.get.mockResolvedValue({
      payment: {
        id: 'pay_new',
        status: 'COMPLETED',
        amountMoney: { amount: BigInt(2500), currency: 'AUD' },
        receiptUrl: 'https://squareup.com/receipt/test',
      },
    })

    const result = await verifySquarePayment('pay_new', 25.0, 'AUD')

    expect(result.valid).toBe(true)
    expect(mockPaymentsApi.get).toHaveBeenCalledWith({ paymentId: 'pay_new' })
  })
})

describe('Payment Verification - Amount Tampering Detection', () => {
  test('rejects payment when amount is less than expected (underpay)', async () => {
    mockPayload.find.mockResolvedValue({ docs: [] })
    mockPaymentsApi.get.mockResolvedValue({
      payment: {
        id: 'pay_tampered',
        status: 'COMPLETED',
        amountMoney: { amount: BigInt(1000), currency: 'AUD' },
        receiptUrl: 'https://squareup.com/receipt/test',
      },
    })

    const result = await verifySquarePayment('pay_tampered', 25.0, 'AUD')

    expect(result.valid).toBe(false)
    expect(result.error).toContain('amount mismatch')
  })

  test('rejects payment when amount is more than expected (overpay)', async () => {
    mockPayload.find.mockResolvedValue({ docs: [] })
    mockPaymentsApi.get.mockResolvedValue({
      payment: {
        id: 'pay_over',
        status: 'COMPLETED',
        amountMoney: { amount: BigInt(5000), currency: 'AUD' },
        receiptUrl: 'https://squareup.com/receipt/test',
      },
    })

    const result = await verifySquarePayment('pay_over', 25.0, 'AUD')

    expect(result.valid).toBe(false)
    expect(result.error).toContain('amount mismatch')
  })

  test('accepts exact amount match', async () => {
    mockPayload.find.mockResolvedValue({ docs: [] })
    mockPaymentsApi.get.mockResolvedValue({
      payment: {
        id: 'pay_exact',
        status: 'COMPLETED',
        amountMoney: { amount: BigInt(1999), currency: 'AUD' },
        receiptUrl: 'https://squareup.com/receipt/test',
      },
    })

    const result = await verifySquarePayment('pay_exact', 19.99, 'AUD')

    expect(result.valid).toBe(true)
  })

  test('rejects payment with missing amount', async () => {
    mockPayload.find.mockResolvedValue({ docs: [] })
    mockPaymentsApi.get.mockResolvedValue({
      payment: {
        id: 'pay_noamount',
        status: 'COMPLETED',
        amountMoney: {},
        receiptUrl: 'https://squareup.com/receipt/test',
      },
    })

    const result = await verifySquarePayment('pay_noamount', 25.0, 'AUD')

    expect(result.valid).toBe(false)
    expect(result.error).toContain('amount not found')
  })
})

describe('Payment Verification - Currency Mismatch Detection', () => {
  test('rejects payment with wrong currency', async () => {
    mockPayload.find.mockResolvedValue({ docs: [] })
    mockPaymentsApi.get.mockResolvedValue({
      payment: {
        id: 'pay_usd',
        status: 'COMPLETED',
        amountMoney: { amount: BigInt(2500), currency: 'USD' },
        receiptUrl: 'https://squareup.com/receipt/test',
      },
    })

    const result = await verifySquarePayment('pay_usd', 25.0, 'AUD')

    expect(result.valid).toBe(false)
    expect(result.error).toContain('Currency mismatch')
    expect(result.error).toContain('AUD')
    expect(result.error).toContain('USD')
  })

  test('accepts matching currency', async () => {
    mockPayload.find.mockResolvedValue({ docs: [] })
    mockPaymentsApi.get.mockResolvedValue({
      payment: {
        id: 'pay_gbp',
        status: 'COMPLETED',
        amountMoney: { amount: BigInt(1500), currency: 'GBP' },
        receiptUrl: 'https://squareup.com/receipt/test',
      },
    })

    const result = await verifySquarePayment('pay_gbp', 15.0, 'GBP')

    expect(result.valid).toBe(true)
  })
})

describe('Payment Verification - Status Validation', () => {
  test('rejects payment with PENDING status', async () => {
    mockPayload.find.mockResolvedValue({ docs: [] })
    mockPaymentsApi.get.mockResolvedValue({
      payment: {
        id: 'pay_pending',
        status: 'PENDING',
        amountMoney: { amount: BigInt(2500), currency: 'AUD' },
      },
    })

    const result = await verifySquarePayment('pay_pending', 25.0, 'AUD')

    expect(result.valid).toBe(false)
    expect(result.error).toContain('PENDING')
    expect(result.status).toBe('PENDING')
  })

  test('rejects payment with FAILED status', async () => {
    mockPayload.find.mockResolvedValue({ docs: [] })
    mockPaymentsApi.get.mockResolvedValue({
      payment: {
        id: 'pay_failed',
        status: 'FAILED',
        amountMoney: { amount: BigInt(2500), currency: 'AUD' },
      },
    })

    const result = await verifySquarePayment('pay_failed', 25.0, 'AUD')

    expect(result.valid).toBe(false)
    expect(result.error).toContain('FAILED')
  })

  test('rejects payment with CANCELED status', async () => {
    mockPayload.find.mockResolvedValue({ docs: [] })
    mockPaymentsApi.get.mockResolvedValue({
      payment: {
        id: 'pay_canceled',
        status: 'CANCELED',
        amountMoney: { amount: BigInt(2500), currency: 'AUD' },
      },
    })

    const result = await verifySquarePayment('pay_canceled', 25.0, 'AUD')

    expect(result.valid).toBe(false)
    expect(result.error).toContain('CANCELED')
  })

  test('rejects when payment not found in Square', async () => {
    mockPayload.find.mockResolvedValue({ docs: [] })
    mockPaymentsApi.get.mockResolvedValue({
      payment: null,
    })

    const result = await verifySquarePayment('pay_missing', 25.0, 'AUD')

    expect(result.valid).toBe(false)
    expect(result.error).toContain('not found')
  })
})

describe('Payment Verification - Error Handling', () => {
  test('handles Square API errors gracefully', async () => {
    mockPayload.find.mockResolvedValue({ docs: [] })
    mockPaymentsApi.get.mockRejectedValue(new Error('Network error'))

    const result = await verifySquarePayment('pay_error', 25.0, 'AUD')

    expect(result.valid).toBe(false)
    expect(result.error).toContain('Failed to verify payment')
    // Should NOT expose internal error details
    expect(result.error).not.toContain('Network error')
  })

  test('returns receipt URL and status on valid payment', async () => {
    mockPayload.find.mockResolvedValue({ docs: [] })
    mockPaymentsApi.get.mockResolvedValue({
      payment: {
        id: 'pay_full',
        status: 'COMPLETED',
        amountMoney: { amount: BigInt(3350), currency: 'AUD' },
        receiptUrl: 'https://squareup.com/receipt/abc123',
      },
    })

    const result = await verifySquarePayment('pay_full', 33.5, 'AUD')

    expect(result.valid).toBe(true)
    expect(result.receiptUrl).toBe('https://squareup.com/receipt/abc123')
    expect(result.status).toBe('COMPLETED')
  })
})
