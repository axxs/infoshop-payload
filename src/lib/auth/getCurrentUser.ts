import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { User } from '@/payload-types'

/**
 * Read the authenticated user from the request headers.
 * Server-side only — intended for use in server components and route handlers.
 *
 * @returns The authenticated user, or null if not authenticated or on error.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const payload = await getPayload({ config })
    const headersList = await getHeaders()
    const { user } = await payload.auth({ headers: headersList as Headers })
    return (user as User) ?? null
  } catch {
    return null
  }
}
