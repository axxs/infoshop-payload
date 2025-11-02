/**
 * Square Payments API Endpoint
 * Processes card payments through Square POS
 */

import { NextRequest, NextResponse } from 'next/server'
import { processPayment } from '@/lib/square/payments'
import type { Currency } from 'square'

/**
 * Allowed currency codes
 */
const ALLOWED_CURRENCIES: Currency[] = ['AUD', 'USD', 'EUR', 'GBP', 'CAD', 'NZD']

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.sourceId) {
      return NextResponse.json({ error: 'Missing required field: sourceId' }, { status: 400 })
    }

    if (!body.amount || typeof body.amount !== 'number' || body.amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount: must be a positive number' },
        { status: 400 },
      )
    }

    // Validate currency if provided
    const currency: Currency = body.currency || 'AUD'
    if (!ALLOWED_CURRENCIES.includes(currency)) {
      return NextResponse.json(
        { error: `Invalid currency. Allowed: ${ALLOWED_CURRENCIES.join(', ')}` },
        { status: 400 },
      )
    }

    // Process payment through Square
    const result = await processPayment({
      sourceId: body.sourceId,
      amount: body.amount,
      currency,
      referenceId: body.referenceId,
      note: body.note,
      customerId: body.customerId,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        transactionId: result.transactionId,
        receiptUrl: result.receiptUrl,
        payment: result.payment,
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: result.error || 'Payment processing failed',
      },
      { status: 400 },
    )
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
