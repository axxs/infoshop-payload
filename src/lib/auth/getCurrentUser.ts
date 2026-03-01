import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Read the authenticated user from the request headers.
 * Server-side only — intended for use in server components and route handlers.
 * Returns null if not authenticated or if an error occurs.
 */
export async function getCurrentUser() {
  try {
    const payload = await getPayload({ config })
    const headersList = await getHeaders()
    const { user } = await payload.auth({ headers: headersList as Headers })
    return user
  } catch {
    return null
  }
}
