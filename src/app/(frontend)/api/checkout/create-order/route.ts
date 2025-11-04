/**
 * Checkout API Route
 * Creates order after successful payment
 *
 * SECURITY WARNING: This API route lacks CSRF protection.
 * TODO: Migrate to Server Action for better security.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCart, clearCart } from '@/lib/cart'
import { createOrder } from '@/lib/checkout/createOrder'
import { verifySquarePayment } from '@/lib/square/paymentVerification'
import { calculateTax } from '@/lib/tax/taxCalculation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.squareTransactionId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: squareTransactionId' },
        { status: 400 },
      )
    }

    if (!body.paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: paymentMethod' },
        { status: 400 },
      )
    }

    // Get current cart
    const cartResult = await getCart()

    if (!cartResult.success || !cartResult.cart) {
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve cart' },
        { status: 400 },
      )
    }

    // Check cart is not empty
    if (cartResult.cart.items.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 })
    }

    // CRITICAL SECURITY: Verify payment with Square (if CARD payment)
    if (body.paymentMethod === 'CARD') {
      // Calculate expected amount (including tax)
      const taxCalculation = calculateTax(cartResult.cart.subtotal, cartResult.cart.currency)
      const expectedAmount = taxCalculation.totalWithTax

      const paymentVerification = await verifySquarePayment(
        body.squareTransactionId,
        expectedAmount,
        cartResult.cart.currency,
      )

      if (!paymentVerification.valid) {
        return NextResponse.json(
          {
            success: false,
            error: `Payment verification failed: ${paymentVerification.error}`,
          },
          { status: 400 },
        )
      }
    }

    // Create order
    const orderResult = await createOrder({
      cart: cartResult.cart,
      squareTransactionId: body.squareTransactionId,
      squareReceiptUrl: body.squareReceiptUrl,
      paymentMethod: body.paymentMethod,
      customerEmail: body.customerEmail,
      customerName: body.customerName,
    })

    if (!orderResult.success) {
      return NextResponse.json(
        { success: false, error: orderResult.error || 'Failed to create order' },
        { status: 500 },
      )
    }

    // Clear cart after successful order
    await clearCart()

    return NextResponse.json({
      success: true,
      saleId: orderResult.saleId,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    )
  }
}
