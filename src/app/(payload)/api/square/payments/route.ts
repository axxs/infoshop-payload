/**
 * Square Payments API Endpoint
 * Processes card payments through Square POS
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { processPayment } from '@/lib/square/payments'
import { DEFAULT_CURRENCY } from '@/lib/square/constants'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimit'
import type { Currency } from 'square'

/** Rate limit: 5 payment attempts per minute per IP */
const PAYMENT_RATE_LIMIT = { maxRequests: 5, windowSeconds: 60 }

export async function POST(request: NextRequest) {
  try {
    // Rate limiting — prevent card testing attacks
    const rateCheck = checkRateLimit(request, PAYMENT_RATE_LIMIT)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many payment attempts. Please try again later.' },
        {
          status: 429,
          headers: getRateLimitHeaders(
            PAYMENT_RATE_LIMIT.maxRequests,
            rateCheck.remaining,
            rateCheck.resetAt,
          ),
        },
      )
    }

    // Authentication — only authenticated users can process payments
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

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

    // Use provided currency or default to AUD
    // Currency validation is handled by Square API
    const currency: Currency = body.currency || DEFAULT_CURRENCY

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
