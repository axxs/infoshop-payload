/**
 * Order Creation Integration Tests
 *
 * Tests the order creation logic including:
 * - Stock deduction with optimistic locking
 * - Concurrent checkout race condition handling
 * - Cart validation
 * - Price staleness warnings
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'

const mockPayload = {
  find: vi.fn(),
  findByID: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}

// Must be before imports
vi.mock('@payload-config', () => ({ default: {} }))

vi.mock('payload', () => ({
  getPayload: () => Promise.resolve(mockPayload),
}))

vi.mock('@/lib/tax/taxCalculation', () => ({
  calculateTax: (subtotal: number) => ({
    taxRate: 0.1,
    taxAmount: subtotal * 0.1,
    totalWithTax: subtotal * 1.1,
    taxDescription: 'GST (10%)',
  }),
}))

vi.mock('@/lib/cart/validation', () => ({
  isCartExpired: vi.fn(() => false),
}))

import { createOrder } from '@/lib/checkout/createOrder'
import { isCartExpired } from '@/lib/cart/validation'
import type { PopulatedCart } from '@/lib/cart/types'

function makeCart(overrides: Partial<PopulatedCart> = {}): PopulatedCart {
  return {
    items: [
      {
        bookId: 1,
        quantity: 1,
        priceAtAdd: 25.0,
        currency: 'AUD',
        isMemberPrice: false,
        lineTotal: 25.0,
        book: {
          id: 1,
          title: 'Test Book',
          author: null,
          isbn: null,
          externalCoverUrl: null,
          sellPrice: 25.0,
          memberPrice: 20.0,
          stockQuantity: 10,
          currency: 'AUD',
        },
      },
    ],
    itemCount: 1,
    subtotal: 25.0,
    currency: 'AUD',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(isCartExpired).mockReturnValue(false)

  // Default mock: book exists with sufficient stock
  mockPayload.find.mockResolvedValue({
    docs: [
      {
        id: 1,
        title: 'Test Book',
        sellPrice: 25.0,
        stockQuantity: 10,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  })

  // Default: findByID returns fresh stock
  mockPayload.findByID.mockResolvedValue({
    id: 1,
    title: 'Test Book',
    sellPrice: 25.0,
    stockQuantity: 10,
    updatedAt: '2026-01-01T00:00:00.000Z',
  })

  // Default: create returns mock sale items and sale
  let createCallCount = 0
  mockPayload.create.mockImplementation(() => {
    createCallCount++
    return Promise.resolve({ id: createCallCount })
  })

  // Default: optimistic lock update succeeds
  mockPayload.update.mockResolvedValue({ docs: [{ id: 1, stockQuantity: 9 }] })
})

describe('Order Creation - Cart Validation', () => {
  test('rejects expired cart', async () => {
    vi.mocked(isCartExpired).mockReturnValue(true)

    const result = await createOrder({
      cart: makeCart(),
      squareTransactionId: 'txn_1',
      paymentMethod: 'CARD',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('expired')
  })

  test('rejects when all books have been deleted', async () => {
    mockPayload.find.mockResolvedValue({ docs: [] })

    const result = await createOrder({
      cart: makeCart(),
      squareTransactionId: 'txn_2',
      paymentMethod: 'CARD',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('no longer exist')
  })
})

describe('Order Creation - Stock Deduction', () => {
  test('rejects order when stock is insufficient at initial check', async () => {
    mockPayload.find.mockResolvedValue({
      docs: [{ id: 1, title: 'Test Book', sellPrice: 25.0, stockQuantity: 0 }],
    })

    const result = await createOrder({
      cart: makeCart(),
      squareTransactionId: 'txn_3',
      paymentMethod: 'CARD',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Insufficient stock')
  })

  test('rejects order when stock depleted between check and update', async () => {
    mockPayload.find.mockResolvedValue({
      docs: [{ id: 1, title: 'Test Book', sellPrice: 25.0, stockQuantity: 10 }],
    })

    mockPayload.findByID.mockResolvedValue({
      id: 1,
      title: 'Test Book',
      sellPrice: 25.0,
      stockQuantity: 0,
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    const result = await createOrder({
      cart: makeCart(),
      squareTransactionId: 'txn_4',
      paymentMethod: 'CARD',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Insufficient stock')
  })
})

describe('Order Creation - Optimistic Locking', () => {
  test('retries stock update on concurrent modification', async () => {
    // First attempt: optimistic lock fails (another checkout modified the book)
    // Second attempt: succeeds
    mockPayload.update
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [{ id: 1, stockQuantity: 8 }] })

    mockPayload.findByID
      .mockResolvedValueOnce({
        id: 1,
        title: 'Test Book',
        sellPrice: 25.0,
        stockQuantity: 10,
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
      .mockResolvedValueOnce({
        id: 1,
        title: 'Test Book',
        sellPrice: 25.0,
        stockQuantity: 9,
        updatedAt: '2026-01-01T00:01:00.000Z',
      })

    const result = await createOrder({
      cart: makeCart(),
      squareTransactionId: 'txn_5',
      paymentMethod: 'CARD',
    })

    expect(result.success).toBe(true)
    expect(mockPayload.update).toHaveBeenCalledTimes(2)
  })

  test('fails after max retries on persistent conflict', async () => {
    mockPayload.update.mockResolvedValue({ docs: [] })

    mockPayload.findByID.mockResolvedValue({
      id: 1,
      title: 'Test Book',
      sellPrice: 25.0,
      stockQuantity: 10,
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    const result = await createOrder({
      cart: makeCart(),
      squareTransactionId: 'txn_6',
      paymentMethod: 'CARD',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('concurrent modifications')
    expect(mockPayload.update).toHaveBeenCalledTimes(3) // MAX_RETRIES = 3
  })

  test('uses updatedAt in where clause for optimistic locking', async () => {
    const result = await createOrder({
      cart: makeCart(),
      squareTransactionId: 'txn_7',
      paymentMethod: 'CARD',
    })

    expect(result.success).toBe(true)

    const updateCall = mockPayload.update.mock.calls[0][0]
    expect(updateCall.where).toEqual({
      id: { equals: 1 },
      updatedAt: { equals: '2026-01-01T00:00:00.000Z' },
    })
  })
})

describe('Order Creation - Price Staleness', () => {
  test('warns when price changed more than 10%', async () => {
    mockPayload.find.mockResolvedValue({
      docs: [{ id: 1, title: 'Test Book', sellPrice: 30.0, stockQuantity: 10 }],
    })

    const result = await createOrder({
      cart: makeCart(),
      squareTransactionId: 'txn_8',
      paymentMethod: 'CARD',
    })

    expect(result.success).toBe(true)
    expect(result.warnings).toBeDefined()
    expect(result.warnings![0]).toContain('Price')
  })

  test('no warning when price change is under 10%', async () => {
    mockPayload.find.mockResolvedValue({
      docs: [{ id: 1, title: 'Test Book', sellPrice: 26.0, stockQuantity: 10 }],
    })

    const result = await createOrder({
      cart: makeCart(),
      squareTransactionId: 'txn_9',
      paymentMethod: 'CARD',
    })

    expect(result.success).toBe(true)
    expect(result.warnings).toBeUndefined()
  })
})

describe('Order Creation - Successful Flow', () => {
  test('creates sale items and sale record', async () => {
    const result = await createOrder({
      cart: makeCart(),
      squareTransactionId: 'txn_10',
      squareReceiptUrl: 'https://squareup.com/receipt/test',
      paymentMethod: 'CARD',
      customerEmail: 'test@example.com',
      customerName: 'Test User',
    })

    expect(result.success).toBe(true)
    expect(result.saleId).toBeDefined()

    const saleItemCreate = mockPayload.create.mock.calls[0][0]
    expect(saleItemCreate.collection).toBe('sale-items')
    expect(saleItemCreate.data.unitPrice).toBe(25.0)

    const saleCreate = mockPayload.create.mock.calls[1][0]
    expect(saleCreate.collection).toBe('sales')
    expect(saleCreate.data.squareTransactionId).toBe('txn_10')
    expect(saleCreate.data.customerEmail).toBe('test@example.com')
  })
})
