/**
 * Cart Validation Logic
 */

import { z } from 'zod'

/** Supported currencies */
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD'] as const

/** Maximum items in cart */
export const MAX_CART_ITEMS = 50

/** Maximum quantity per item */
export const MAX_ITEM_QUANTITY = 99

/** Cart expiry in days */
export const CART_EXPIRY_DAYS = 7

/** Cart item validation schema */
export const CartItemSchema = z.object({
  bookId: z.number().int().positive('Book ID is required'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(MAX_ITEM_QUANTITY, `Quantity cannot exceed ${MAX_ITEM_QUANTITY}`),
  priceAtAdd: z.number().positive('Price must be positive'),
  currency: z.enum(SUPPORTED_CURRENCIES),
  isMemberPrice: z.boolean(),
})

/** Cart validation schema */
export const CartSchema = z.object({
  items: z.array(CartItemSchema).max(MAX_CART_ITEMS, `Cart cannot exceed ${MAX_CART_ITEMS} items`),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
})

/**
 * Validate cart structure
 */
export function validateCart(cart: unknown): {
  success: boolean
  data?: z.infer<typeof CartSchema>
  error?: string
} {
  try {
    const validated = CartSchema.parse(cart)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Invalid cart data' }
  }
}

/**
 * Check if cart has expired
 */
export function isCartExpired(cart: { expiresAt: string }): boolean {
  const expiryDate = new Date(cart.expiresAt)
  const now = new Date()
  return now > expiryDate
}

/**
 * Create new empty cart
 */
export function createEmptyCart(): z.infer<typeof CartSchema> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  return {
    items: [],
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }
}

/**
 * Validate quantity against stock
 */
export function validateQuantityAgainstStock(
  requestedQuantity: number,
  stockQuantity: number,
): { valid: boolean; error?: string } {
  if (requestedQuantity > stockQuantity) {
    return {
      valid: false,
      error: `Only ${stockQuantity} items available in stock`,
    }
  }

  if (requestedQuantity > MAX_ITEM_QUANTITY) {
    return {
      valid: false,
      error: `Maximum quantity per item is ${MAX_ITEM_QUANTITY}`,
    }
  }

  return { valid: true }
}
