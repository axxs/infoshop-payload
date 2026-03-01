/**
 * Authentication Server Actions
 * Registration, login, logout, and session helpers.
 * Server Actions have built-in CSRF protection via Next.js.
 */

'use server'

import { headers as getHeaders } from 'next/headers'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

const COOKIE_NAME = 'payload-token'
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60 // 7 days

/** Shared cookie options */
function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  }
}

// ---------------------------------------------------------------------------
// Rate limiting — prevent account spam (5 registrations per IP per 15 minutes)
// Per-process; acceptable for a low-traffic storefront.
// ---------------------------------------------------------------------------

const registrationLog = new Map<string, number[]>()
const REGISTER_RATE_LIMIT_MAX = 5
const REGISTER_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
let lastRegistrationCleanup = Date.now()

function isRegistrationRateLimited(ip: string): boolean {
  const now = Date.now()

  // Periodically prune stale entries
  if (now - lastRegistrationCleanup > REGISTER_RATE_LIMIT_WINDOW_MS) {
    for (const [key, timestamps] of registrationLog) {
      const recent = timestamps.filter((t) => now - t < REGISTER_RATE_LIMIT_WINDOW_MS)
      if (recent.length === 0) {
        registrationLog.delete(key)
      } else {
        registrationLog.set(key, recent)
      }
    }
    lastRegistrationCleanup = now
  }

  const timestamps = registrationLog.get(ip) ?? []
  const recent = timestamps.filter((t) => now - t < REGISTER_RATE_LIMIT_WINDOW_MS)
  registrationLog.set(ip, recent)
  return recent.length >= REGISTER_RATE_LIMIT_MAX
}

function recordRegistration(ip: string): void {
  const timestamps = registrationLog.get(ip) ?? []
  timestamps.push(Date.now())
  registrationLog.set(ip, timestamps)
}

async function getClientIp(): Promise<string> {
  const headersList = await getHeaders()
  return (
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ??
    headersList.get('x-real-ip') ??
    'unknown'
  )
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name is too long'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

// ---------------------------------------------------------------------------
// Action result types
// ---------------------------------------------------------------------------

export interface AuthActionResult {
  success: boolean
  error?: string
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

/** Register a new customer account and auto-login */
export async function registerUser(formData: FormData): Promise<AuthActionResult> {
  // Rate limit by IP
  const ip = await getClientIp()
  if (isRegistrationRateLimited(ip)) {
    return { success: false, error: 'Too many registration attempts. Please try again later.' }
  }

  const raw = {
    name: formData.get('name')?.toString().trim() ?? '',
    email: formData.get('email')?.toString().trim() ?? '',
    password: formData.get('password')?.toString() ?? '',
  }

  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { name, email, password } = parsed.data

  // Record attempt before create so failed attempts count against the limit
  recordRegistration(ip)

  try {
    const payload = await getPayload({ config })

    // Create user — the beforeChange hook forces role: 'customer'
    await payload.create({
      collection: 'users',
      draft: false,
      data: { name, email, password, role: 'customer' },
    })

    // Auto-login to get a token
    const loginResult = await payload.login({
      collection: 'users',
      data: { email, password },
    })

    if (loginResult.token) {
      const jar = await cookies()
      jar.set(COOKIE_NAME, loginResult.token, cookieOptions())
    }

    return { success: true }
  } catch (err) {
    // Payload throws on duplicate email
    const message = err instanceof Error ? err.message : 'Registration failed'
    if (message.toLowerCase().includes('unique') || message.toLowerCase().includes('duplicate')) {
      return { success: false, error: 'An account with this email already exists' }
    }
    return { success: false, error: 'Registration failed. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

/** Log in with email and password */
export async function loginUser(formData: FormData): Promise<AuthActionResult> {
  const raw = {
    email: formData.get('email')?.toString().trim() ?? '',
    password: formData.get('password')?.toString() ?? '',
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { email, password } = parsed.data

  try {
    const payload = await getPayload({ config })

    const result = await payload.login({
      collection: 'users',
      data: { email, password },
    })

    if (result.token) {
      const jar = await cookies()
      jar.set(COOKIE_NAME, result.token, cookieOptions())
    }

    return { success: true }
  } catch {
    return { success: false, error: 'Invalid email or password' }
  }
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

/** Delete the auth cookie */
export async function logoutUser(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE_NAME)
}

