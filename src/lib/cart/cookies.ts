/**
 * Cart Cookie Management
 * Handles encrypted cookie storage for shopping cart
 */

import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import type { Cart } from './types'
import {
  validateCart,
  createEmptyCart,
  isCartExpired,
  MAX_COOKIE_SIZE_BYTES,
  COOKIE_SIZE_WARNING_THRESHOLD,
} from './validation'

/** Cookie name for cart storage */
const CART_COOKIE_NAME = 'infoshop_cart'

/** Cookie max age (7 days in seconds) */
const CART_COOKIE_MAX_AGE = 7 * 24 * 60 * 60

/** JWT secret key (from environment - required) */
function getSecretKey(): Uint8Array {
  const secret = process.env.CART_ENCRYPTION_SECRET

  if (!secret) {
    throw new Error(
      'CART_ENCRYPTION_SECRET environment variable is required for cart encryption. ' +
        'Generate one with: openssl rand -base64 32',
    )
  }

  if (secret.length < 32) {
    throw new Error('CART_ENCRYPTION_SECRET must be at least 32 characters long')
  }

  return new TextEncoder().encode(secret)
}

/**
 * Encrypt cart data into JWT
 */
async function encryptCart(cart: Cart): Promise<string> {
  const secret = getSecretKey()

  const jwt = await new SignJWT({ cart })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)

  return jwt
}

/**
 * Decrypt cart data from JWT
 */
async function decryptCart(token: string): Promise<Cart | null> {
  try {
    const secret = getSecretKey()
    const { payload } = await jwtVerify(token, secret)

    if (!payload.cart) {
      return null
    }

    return payload.cart as Cart
  } catch (_error) {
    // Token invalid or expired
    return null
  }
}

/**
 * Get cart from cookies
 */
export async function getCartFromCookies(): Promise<Cart> {
  const cookieStore = await cookies()
  const cartCookie = cookieStore.get(CART_COOKIE_NAME)

  if (!cartCookie?.value) {
    return createEmptyCart()
  }

  // Decrypt cart
  const cart = await decryptCart(cartCookie.value)

  if (!cart) {
    return createEmptyCart()
  }

  // Validate cart structure
  const validation = validateCart(cart)
  if (!validation.success || !validation.data) {
    return createEmptyCart()
  }

  // Check if cart expired
  if (isCartExpired(validation.data)) {
    return createEmptyCart()
  }

  return validation.data
}

/**
 * Save cart to cookies with size validation
 */
export async function saveCartToCookies(cart: Cart): Promise<void> {
  const cookieStore = await cookies()

  // Encrypt cart
  const encrypted = await encryptCart(cart)

  // SECURITY: Check cookie size to prevent exceeding browser limits
  const cookieSizeBytes = new Blob([encrypted]).size

  if (cookieSizeBytes > MAX_COOKIE_SIZE_BYTES) {
    throw new Error(
      `Cart is too large (${cookieSizeBytes} bytes). Please remove some items. Maximum cart size is ${MAX_COOKIE_SIZE_BYTES} bytes.`,
    )
  }

  // Warn if approaching limit (for monitoring/debugging)
  if (cookieSizeBytes > COOKIE_SIZE_WARNING_THRESHOLD) {
    console.warn(
      `⚠️ Cart cookie size approaching limit: ${cookieSizeBytes}/${MAX_COOKIE_SIZE_BYTES} bytes (${Math.round((cookieSizeBytes / MAX_COOKIE_SIZE_BYTES) * 100)}%)`,
    )
  }

  // Set cookie with httpOnly and secure flags
  cookieStore.set(CART_COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: CART_COOKIE_MAX_AGE,
    path: '/',
  })
}

/**
 * Clear cart cookie
 */
export async function clearCartCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(CART_COOKIE_NAME)
}
