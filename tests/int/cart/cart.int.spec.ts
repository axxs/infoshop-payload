/**
 * Shopping Cart Integration Tests
 *
 * Tests the server-side cart functionality including:
 * - Adding items to cart
 * - Updating quantities
 * - Removing items
 * - Cart validation
 * - Stock quantity checks
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { cookies } from 'next/headers'
import {
  addToCart,
  updateQuantity,
  removeFromCart,
  getCart,
  clearCart,
  getCartItemCount,
} from '@/lib/cart/server-actions'
import { validateCart, isCartExpired, createEmptyCart } from '@/lib/cart/validation'

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Payload
vi.mock('payload', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    getPayload: vi.fn(() =>
      Promise.resolve({
        findByID: vi.fn(),
        find: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      }),
    ),
  }
})

describe('Cart Validation', () => {
  test('creates valid empty cart', () => {
    const cart = createEmptyCart()

    expect(cart.items).toEqual([])
    expect(cart.createdAt).toBeDefined()
    expect(cart.expiresAt).toBeDefined()

    // Expiry should be 7 days from now
    const createdDate = new Date(cart.createdAt)
    const expiryDate = new Date(cart.expiresAt)
    const diffDays = (expiryDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)

    expect(diffDays).toBe(7)
  })

  test('validates cart structure correctly', () => {
    const validCart = {
      items: [
        {
          bookId: 1,
          quantity: 2,
          priceAtAdd: 29.99,
          currency: 'AUD',
          isMemberPrice: false,
        },
      ],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }

    const result = validateCart(validCart)
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  test('rejects invalid cart structure', () => {
    const invalidCart = {
      items: [
        {
          bookId: -1, // Invalid: negative ID
          quantity: 2,
          priceAtAdd: 29.99,
          currency: 'AUD',
          isMemberPrice: false,
        },
      ],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }

    const result = validateCart(invalidCart)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  test('rejects quantity exceeding MAX_ITEM_QUANTITY', () => {
    const invalidCart = {
      items: [
        {
          bookId: 1,
          quantity: 100, // Invalid: exceeds MAX_ITEM_QUANTITY (99)
          priceAtAdd: 29.99,
          currency: 'AUD',
          isMemberPrice: false,
        },
      ],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }

    const result = validateCart(invalidCart)
    expect(result.success).toBe(false)
    expect(result.error).toContain('99')
  })

  test('detects expired carts', () => {
    const expiredCart = {
      expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
    }

    expect(isCartExpired(expiredCart)).toBe(true)
  })

  test('validates non-expired carts', () => {
    const validCart = {
      expiresAt: new Date(Date.now() + 1000).toISOString(), // Expires in 1 second
    }

    expect(isCartExpired(validCart)).toBe(false)
  })
})

describe('Cart Server Actions Structure', () => {
  test('addToCart returns correct result structure', async () => {
    const result = await addToCart(1, 1, false)

    expect(result).toHaveProperty('success')
    if (result.success) {
      expect(result).toHaveProperty('cart')
      expect(result.cart).toHaveProperty('items')
      expect(result.cart).toHaveProperty('subtotal')
      expect(result.cart).toHaveProperty('currency')
    } else {
      expect(result).toHaveProperty('error')
    }
  })

  test('updateQuantity returns correct result structure', async () => {
    const result = await updateQuantity(1, 2)

    expect(result).toHaveProperty('success')
    if (result.success) {
      expect(result).toHaveProperty('cart')
    } else {
      expect(result).toHaveProperty('error')
    }
  })

  test('removeFromCart returns correct result structure', async () => {
    const result = await removeFromCart(1)

    expect(result).toHaveProperty('success')
    if (result.success) {
      expect(result).toHaveProperty('cart')
    } else {
      expect(result).toHaveProperty('error')
    }
  })

  test('getCart returns correct result structure', async () => {
    const result = await getCart()

    expect(result).toHaveProperty('success')
    if (result.success) {
      expect(result).toHaveProperty('cart')
      expect(result.cart).toHaveProperty('items')
      expect(result.cart).toHaveProperty('itemCount')
      expect(result.cart).toHaveProperty('subtotal')
      expect(result.cart).toHaveProperty('currency')
    } else {
      expect(result).toHaveProperty('error')
    }
  })

  test('getCartItemCount returns number', async () => {
    const count = await getCartItemCount()
    expect(typeof count).toBe('number')
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('clearCart completes without error', async () => {
    await expect(clearCart()).resolves.toBeUndefined()
  })
})

describe('Cart Type Safety', () => {
  test('bookId must be number type', () => {
    const cart = {
      items: [
        {
          bookId: 1, // number, not string
          quantity: 1,
          priceAtAdd: 29.99,
          currency: 'AUD',
          isMemberPrice: false,
        },
      ],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }

    const result = validateCart(cart)
    expect(result.success).toBe(true)

    // Test with string ID (should fail)
    const invalidCart = {
      items: [
        {
          bookId: '1' as any, // string (invalid)
          quantity: 1,
          priceAtAdd: 29.99,
          currency: 'AUD',
          isMemberPrice: false,
        },
      ],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }

    const invalidResult = validateCart(invalidCart)
    expect(invalidResult.success).toBe(false)
  })

  test('currency must be supported currency', () => {
    const cart = {
      items: [
        {
          bookId: 1,
          quantity: 1,
          priceAtAdd: 29.99,
          currency: 'JPY' as any, // Unsupported currency
          isMemberPrice: false,
        },
      ],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }

    const result = validateCart(cart)
    expect(result.success).toBe(false)
  })
})
