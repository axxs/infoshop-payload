import type { Access } from 'payload'
import { isAdminOrVolunteer } from '@/lib/access'

/**
 * Public users see only published documents; admins/volunteers see all.
 * Used for collections with Payload's draft system (`versions.drafts: true`).
 */
export const publishedOrAdmin: Access = (args) => {
  if (isAdminOrVolunteer(args)) return true

  return {
    _status: { equals: 'published' },
  }
}
