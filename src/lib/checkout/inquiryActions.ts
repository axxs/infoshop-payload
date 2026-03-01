'use server'

import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCart, clearCart } from '@/lib/cart'
import { getStorePaymentSettings } from '@/lib/square/getStoreSettings'
import type { Theme } from '@/payload-types'

interface SubmitInquiryInput {
  customerName: string
  customerEmail: string
  message: string
}

type SubmitInquiryResult =
  | { success: true }
  | { success: false; error: string }

/** In-memory rate limit for inquiry submissions: 3 per 10 minutes per IP */
const MAX_ENTRIES = 5000
const inquiryRateLimit = new Map<string, { count: number; resetAt: number }>()
const INQUIRY_RATE_LIMIT = { maxRequests: 3, windowMs: 10 * 60 * 1000 }

// Periodically evict expired entries to prevent memory leaks
setInterval(
  () => {
    const now = Date.now()
    for (const [key, entry] of inquiryRateLimit.entries()) {
      if (entry.resetAt < now) {
        inquiryRateLimit.delete(key)
      }
    }
  },
  5 * 60 * 1000,
)

async function isRateLimited(): Promise<boolean> {
  const hdrs = await headers()
  const forwarded = hdrs.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : hdrs.get('x-real-ip') || 'unknown'

  const now = Date.now()
  const key = `inquiry:${ip}`
  const entry = inquiryRateLimit.get(key)

  if (!entry || entry.resetAt < now) {
    inquiryRateLimit.set(key, { count: 1, resetAt: now + INQUIRY_RATE_LIMIT.windowMs })
  } else {
    entry.count++
    if (entry.count > INQUIRY_RATE_LIMIT.maxRequests) return true
  }

  // Evict oldest entry if over capacity
  if (inquiryRateLimit.size > MAX_ENTRIES) {
    const oldestKey = inquiryRateLimit.keys().next().value
    if (oldestKey) inquiryRateLimit.delete(oldestKey)
  }

  return false
}

export async function submitInquiry(input: SubmitInquiryInput): Promise<SubmitInquiryResult> {
  // Only allow inquiries when payments are disabled
  const { paymentsEnabled } = await getStorePaymentSettings()
  if (paymentsEnabled) {
    return { success: false, error: 'Inquiries are not accepted when online payments are enabled.' }
  }

  if (await isRateLimited()) {
    return { success: false, error: 'Too many inquiries. Please try again later.' }
  }

  const { customerName, customerEmail, message } = input

  if (!customerName || customerName.length < 1) {
    return { success: false, error: 'Name is required' }
  }

  if (customerName.length > 200) {
    return { success: false, error: 'Name is too long' }
  }

  if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return { success: false, error: 'A valid email address is required' }
  }

  if (message && message.length > 2000) {
    return { success: false, error: 'Message is too long (max 2000 characters)' }
  }

  const cartResult = await getCart()
  if (!cartResult.success) {
    return { success: false, error: 'Could not read your cart. Please try again.' }
  }

  const { cart } = cartResult
  if (cart.items.length === 0) {
    return { success: false, error: 'Your cart is empty' }
  }

  const payload = await getPayload({ config })

  // Build items array with snapshots
  const items = cart.items.map((item) => ({
    book: item.book.id,
    title: item.book.title,
    quantity: item.quantity,
    price: item.priceAtAdd,
  }))

  const inquiry = await payload.create({
    collection: 'inquiries',
    data: {
      customerName,
      customerEmail,
      message: message || undefined,
      items,
      status: 'new',
    },
  })

  // Send email notification
  try {
    const theme = (await payload.findGlobal({ slug: 'theme' })) as Theme
    const contactEmail = theme?.contactEmail

    if (contactEmail) {
      const bookList = cart.items
        .map((item) => `- ${item.book.title} (x${item.quantity})`)
        .join('\n')

      const adminUrl = escapeHtml(
        `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/admin/collections/inquiries/${inquiry.id}`,
      )

      await payload.sendEmail({
        to: contactEmail,
        subject: `New Book Inquiry from ${customerName}`,
        html: `
          <h2>New Book Inquiry</h2>
          <p><strong>Name:</strong> ${escapeHtml(customerName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>
          ${message ? `<p><strong>Message:</strong> ${escapeHtml(message)}</p>` : ''}
          <h3>Books Requested</h3>
          <pre>${escapeHtml(bookList)}</pre>
          <p><a href="${adminUrl}">View in Admin</a></p>
        `,
      })
    }
  } catch (emailError) {
    // Don't fail the inquiry if email fails — it's already saved in the database
    payload.logger.error({ err: emailError }, 'Failed to send inquiry notification email')
  }

  await clearCart()

  return { success: true }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
