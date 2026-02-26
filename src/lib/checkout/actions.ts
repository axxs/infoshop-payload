/**
 * Checkout Server Actions
 * Server Actions have built-in CSRF protection via Next.js
 */

'use server'

import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCart, clearCart } from '@/lib/cart'
import { createOrder } from '@/lib/checkout/createOrder'
import { verifySquarePayment } from '@/lib/square/paymentVerification'
import { calculateTax } from '@/lib/tax/taxCalculation'

export interface CheckoutActionParams {
  squareTransactionId: string
  squareReceiptUrl?: string
  paymentMethod: 'CARD' | 'CASH' | 'OTHER'
  customerEmail?: string
  customerName?: string
}

export interface CheckoutActionResult {
  success: boolean
  saleId?: number
  error?: string
}

/**
 * Process checkout and create an order
 * This is a Next.js Server Action with built-in CSRF protection
 */
export async function processCheckout(params: CheckoutActionParams): Promise<CheckoutActionResult> {
  try {
    // Validate required fields
    if (!params.squareTransactionId) {
      return { success: false, error: 'Missing required field: squareTransactionId' }
    }

    if (!params.paymentMethod) {
      return { success: false, error: 'Missing required field: paymentMethod' }
    }

    // Get authenticated user if available
    const payload = await getPayload({ config })

    // Check if ordering is enabled
    const theme = (await payload.findGlobal({ slug: 'theme' })) as {
      orderingEnabled?: boolean
    }
    if (!(theme?.orderingEnabled ?? true)) {
      return { success: false, error: 'Online ordering is not currently available' }
    }

    const headersList = await getHeaders()
    const { user } = await payload.auth({ headers: headersList as Headers })

    // Get current cart
    const cartResult = await getCart()

    if (!cartResult.success || !cartResult.cart) {
      return { success: false, error: 'Failed to retrieve cart' }
    }

    // Check cart is not empty
    if (cartResult.cart.items.length === 0) {
      return { success: false, error: 'Cart is empty' }
    }

    // Verify payment with Square (if CARD payment)
    if (params.paymentMethod === 'CARD') {
      const taxCalculation = calculateTax(cartResult.cart.subtotal, cartResult.cart.currency)
      const expectedAmount = taxCalculation.totalWithTax

      const paymentVerification = await verifySquarePayment(
        params.squareTransactionId,
        expectedAmount,
        cartResult.cart.currency,
      )

      if (!paymentVerification.valid) {
        return {
          success: false,
          error: `Payment verification failed: ${paymentVerification.error}`,
        }
      }
    }

    // Create order
    const orderResult = await createOrder({
      cart: cartResult.cart,
      squareTransactionId: params.squareTransactionId,
      squareReceiptUrl: params.squareReceiptUrl,
      paymentMethod: params.paymentMethod,
      customerEmail: params.customerEmail || user?.email || undefined,
      customerName: params.customerName || user?.name || undefined,
      customerId: user?.id,
      status: 'PENDING',
    })

    if (!orderResult.success) {
      return { success: false, error: orderResult.error || 'Failed to create order' }
    }

    // Clear cart after successful order
    await clearCart()

    return {
      success: true,
      saleId: orderResult.saleId,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return { success: false, error: errorMessage }
  }
}
