'use server'

import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Simple in-memory rate limiter for contact form (5 submissions per IP per 15 minutes).
 * Note: this is per-process — it will not persist across restarts or scale across
 * multiple instances. Acceptable for a low-traffic contact form.
 */
const submissionLog = new Map<string, number[]>()
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
let lastCleanup = Date.now()

function isRateLimited(ip: string): boolean {
  const now = Date.now()

  // Periodically prune stale entries to prevent unbounded memory growth
  if (now - lastCleanup > RATE_LIMIT_WINDOW_MS) {
    for (const [key, timestamps] of submissionLog) {
      const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
      if (recent.length === 0) {
        submissionLog.delete(key)
      } else {
        submissionLog.set(key, recent)
      }
    }
    lastCleanup = now
  }

  const timestamps = submissionLog.get(ip) ?? []
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  submissionLog.set(ip, recent)
  return recent.length >= RATE_LIMIT_MAX
}

function recordSubmission(ip: string): void {
  const timestamps = submissionLog.get(ip) ?? []
  timestamps.push(Date.now())
  submissionLog.set(ip, timestamps)
}

export interface ContactFormResult {
  success: boolean
  error?: string
}

/** Submit a contact form entry */
export async function submitContactForm(formData: FormData): Promise<ContactFormResult> {
  const name = formData.get('name')?.toString().trim() ?? ''
  const email = formData.get('email')?.toString().trim() ?? ''
  const message = formData.get('message')?.toString().trim() ?? ''

  // Validate required fields
  if (!name || !email || !message) {
    return { success: false, error: 'All fields are required' }
  }

  if (name.length > 200) {
    return { success: false, error: 'Name is too long (max 200 characters)' }
  }

  if (message.length > 5000) {
    return { success: false, error: 'Message is too long (max 5000 characters)' }
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Please enter a valid email address' }
  }

  // Rate limit by IP
  const headersList = await getHeaders()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ??
    headersList.get('x-real-ip') ??
    'unknown'

  if (isRateLimited(ip)) {
    return { success: false, error: 'Too many submissions. Please try again later.' }
  }

  try {
    const payload = await getPayload({ config })

    await payload.create({
      collection: 'contact-submissions',
      data: { name, email, message },
    })

    recordSubmission(ip)

    return { success: true }
  } catch (err) {
    const payload = await getPayload({ config })
    payload.logger.error({ msg: 'Contact form submission failed', error: err instanceof Error ? err.message : err })
    return { success: false, error: 'Something went wrong. Please try again later.' }
  }
}
