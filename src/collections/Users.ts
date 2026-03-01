import type { CollectionConfig, CollectionBeforeChangeHook } from 'payload'
import { isAdmin, isAuthenticated, adminFieldAccess } from '@/lib/access'

/**
 * Enforce customer role on self-registration.
 * When an unauthenticated request (or a non-admin user) creates a user,
 * force role to 'customer' and strip admin-only membership fields.
 * This prevents privilege escalation via direct REST POST /api/users.
 */
const enforceCustomerOnSelfRegistration: CollectionBeforeChangeHook = ({
  data,
  req,
  operation,
}) => {
  if (operation !== 'create') return data

  const requestingUser = req.user as { role?: string } | null | undefined
  const isAdminUser = requestingUser?.role === 'admin'

  if (!isAdminUser) {
    return {
      ...data,
      role: 'customer',
      isMember: false,
      membershipNumber: undefined,
      memberSince: undefined,
    }
  }

  return data
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    maxLoginAttempts: 10,
    lockTime: 15 * 60 * 1000, // 15 minutes
  },
  hooks: {
    beforeChange: [enforceCustomerOnSelfRegistration],
  },
  access: {
    read: isAuthenticated,
    create: () => true,
    update: ({ req: { user } }) => {
      if (!user) return false
      // Admins can update any user
      if ((user as { role?: string }).role === 'admin') return true
      // Users can update themselves
      return { id: { equals: user.id } }
    },
    delete: isAdmin,
  },
  fields: [
    // Email added by default by auth: true
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'customer',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Volunteer', value: 'volunteer' },
        { label: 'Customer', value: 'customer' },
      ],
      access: {
        // Only admins can set or change roles
        create: adminFieldAccess,
        update: ({ req: { user } }) => {
          return (user as { role?: string } | null)?.role === 'admin'
        },
      },
      admin: {
        description: 'User role determines access permissions',
        position: 'sidebar',
      },
    },
    {
      name: 'name',
      type: 'text',
      admin: {
        description: 'Full name of the user',
      },
    },
    {
      name: 'isMember',
      type: 'checkbox',
      defaultValue: false,
      access: {
        create: adminFieldAccess,
        update: adminFieldAccess,
      },
      admin: {
        description: 'Is this user a collective member? (Grants access to member pricing)',
      },
    },
    {
      name: 'membershipNumber',
      type: 'text',
      access: {
        create: adminFieldAccess,
        update: adminFieldAccess,
      },
      admin: {
        description: 'Membership number (optional)',
        condition: (data) => data.isMember === true,
      },
    },
    {
      name: 'memberSince',
      type: 'date',
      access: {
        create: adminFieldAccess,
        update: adminFieldAccess,
      },
      admin: {
        description: 'Member since date',
        condition: (data) => data.isMember === true,
      },
    },
  ],
}
