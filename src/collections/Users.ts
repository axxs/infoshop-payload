import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticated } from '@/lib/access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    read: isAuthenticated,
    create: isAdmin,
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
        // Only admins can change roles
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
      admin: {
        description: 'Is this user a collective member? (Grants access to member pricing)',
      },
    },
    {
      name: 'membershipNumber',
      type: 'text',
      admin: {
        description: 'Membership number (optional)',
        condition: (data) => data.isMember === true,
      },
    },
    {
      name: 'memberSince',
      type: 'date',
      admin: {
        description: 'Member since date',
        condition: (data) => data.isMember === true,
      },
    },
  ],
}
