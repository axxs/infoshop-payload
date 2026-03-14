import type { Access } from 'payload'

/**
 * Public users see only published documents; admins/volunteers see all.
 * Used for collections with Payload's draft system (`versions.drafts: true`).
 */
export const publishedOrAdmin: Access = ({ req: { user } }) => {
  if (user) {
    const role = (user as { role?: string | null }).role
    if (role === 'admin' || role === 'volunteer') return true
  }

  return {
    _status: { equals: 'published' },
  }
}
