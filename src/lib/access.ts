/**
 * Shared Access Control Utilities
 * Role-based access control helpers for Payload collections
 *
 * Roles:
 * - admin: Full access to everything
 * - volunteer: Can manage books, events, categories, subjects (store operations)
 * - customer: Can read public data and manage their own orders/registrations
 *
 * @module lib/access
 */

import type { Access, FieldAccess } from 'payload'

type UserRole = 'admin' | 'volunteer' | 'customer'

/**
 * Extract role from user object safely.
 * Uses property access to avoid strict TypeScript issues with the generated User type
 * before `payload generate:types` is run with the new role field.
 */
function getUserRole(user: { role?: string | null } | null | undefined): UserRole {
  if (!user) return 'customer'
  const role = user.role
  if (role === 'admin' || role === 'volunteer' || role === 'customer') {
    return role
  }
  return 'customer'
}

/**
 * Check if user has one of the specified roles
 */
function hasRoles(user: { role?: string | null } | null | undefined, roles: UserRole[]): boolean {
  if (!user) return false
  return roles.includes(getUserRole(user))
}

/**
 * Anyone can read (public collections like books, events, categories)
 */
export const publicRead: Access = () => true

/**
 * Only authenticated users can read
 */
export const authenticatedRead: Access = ({ req: { user } }) => !!user

/**
 * Admin or volunteer can perform action (for managing store content)
 */
export const isAdminOrVolunteer: Access = ({ req: { user } }) => {
  if (!user) return false
  return hasRoles(user as { role?: string | null }, ['admin', 'volunteer'])
}

/**
 * Only admins can perform action
 */
export const isAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  return hasRoles(user as { role?: string | null }, ['admin'])
}

/**
 * Any authenticated user can create (e.g., event registration)
 */
export const isAuthenticated: Access = ({ req: { user } }) => !!user

/**
 * Users can read their own records, admin/volunteer can read all.
 * Used for collections with a 'customer' or 'user' relationship field.
 */
export const isAdminOrVolunteerOrSelf =
  (userField: string = 'customer'): Access =>
  ({ req: { user } }) => {
    if (!user) return false
    if (hasRoles(user as { role?: string | null }, ['admin', 'volunteer'])) return true
    // Return a query constraint so customers can only see their own records
    return {
      [userField]: {
        equals: user.id,
      },
    }
  }

/**
 * Field-level access: only admin can edit this field
 */
export const adminFieldAccess: FieldAccess = ({ req: { user } }) => {
  if (!user) return false
  return hasRoles(user as { role?: string | null }, ['admin'])
}
