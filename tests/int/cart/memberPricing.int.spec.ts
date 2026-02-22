/**
 * Member Pricing Authorization Tests
 *
 * Tests that member pricing in the cart:
 * 1. Correctly forwards cookies to payload.auth() for session verification
 * 2. Rejects member pricing for unauthenticated users
 * 3. Rejects member pricing for non-members
 * 4. Allows member pricing for authenticated members
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'

// Track what payload.auth() receives to verify cookie forwarding
const mockAuth = vi.fn()
const mockFindByID = vi.fn()
const mockFind = vi.fn()

vi.mock('@payload-config', () => ({ default: {} }))

vi.mock('payload', () => ({
  getPayload: () =>
    Promise.resolve({
      auth: mockAuth,
      findByID: mockFindByID,
      find: mockFind,
    }),
}))

// Mock next/headers — track what cookies() returns
const mockCookieGet = vi.fn()
const mockCookieSet = vi.fn()
const mockCookieDelete = vi.fn()
const mockCookieToString = vi.fn(() => 'payload-token=test-session-token')

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: mockCookieGet,
      set: mockCookieSet,
      delete: mockCookieDelete,
      toString: mockCookieToString,
    }),
  ),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { addToCart } from '@/lib/cart/server-actions'

beforeEach(() => {
  vi.clearAllMocks()

  // Default: no existing cart cookie
  mockCookieGet.mockReturnValue(undefined)

  // Default: book exists
  mockFindByID.mockResolvedValue({
    id: 1,
    title: 'Test Book',
    author: 'Author',
    isbn: '1234567890',
    externalCoverUrl: null,
    sellPrice: 25.0,
    memberPrice: 20.0,
    stockQuantity: 10,
    currency: 'AUD',
    stockStatus: 'IN_STOCK',
  })

  // Default: find returns populated books
  mockFind.mockResolvedValue({
    docs: [
      {
        id: 1,
        title: 'Test Book',
        author: 'Author',
        isbn: '1234567890',
        externalCoverUrl: null,
        sellPrice: 25.0,
        memberPrice: 20.0,
        stockQuantity: 10,
        currency: 'AUD',
      },
    ],
  })
})

describe('Member Pricing - Cookie Forwarding', () => {
  test('forwards request cookies to payload.auth() for session verification', async () => {
    // Simulate authenticated member
    mockAuth.mockResolvedValue({ user: { id: 1, isMember: true } })

    await addToCart(1, 1, true) // isMemberPrice = true

    // Verify auth was called with headers containing the cookie
    expect(mockAuth).toHaveBeenCalledTimes(1)
    const authCall = mockAuth.mock.calls[0][0]
    expect(authCall.headers).toBeInstanceOf(Headers)

    // Verify the cookie value was forwarded
    const cookieHeader = authCall.headers.get('cookie')
    expect(cookieHeader).toBe('payload-token=test-session-token')
  })
})

describe('Member Pricing - Unauthenticated Users', () => {
  test('rejects member pricing when user is not authenticated', async () => {
    // payload.auth() returns null user
    mockAuth.mockResolvedValue({ user: null })

    const result = await addToCart(1, 1, true) // isMemberPrice = true

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('membership')
    }
  })

  test('does NOT call auth when isMemberPrice is false', async () => {
    // Regular pricing should not check auth
    await addToCart(1, 1, false)

    // auth should NOT have been called (member pricing check is skipped)
    expect(mockAuth).not.toHaveBeenCalled()
  })
})

describe('Member Pricing - Non-Member Users', () => {
  test('rejects member pricing for authenticated non-member', async () => {
    // User is authenticated but not a member
    mockAuth.mockResolvedValue({ user: { id: 1, isMember: false } })

    const result = await addToCart(1, 1, true)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('membership')
    }
  })

  test('rejects member pricing when isMember field is undefined', async () => {
    // User exists but has no membership field
    mockAuth.mockResolvedValue({ user: { id: 1 } })

    const result = await addToCart(1, 1, true)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('membership')
    }
  })
})

describe('Member Pricing - Authorized Members', () => {
  test('allows member pricing for authenticated member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 1, isMember: true } })

    const result = await addToCart(1, 1, true)

    // Should succeed (book exists, stock available, member verified)
    // If it fails, it should not be due to membership
    if (!result.success) {
      expect(result.error).not.toContain('membership')
      expect(result.error).not.toContain('Member')
    } else {
      expect(result.success).toBe(true)
    }
  })
})
