import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    // Email added by default by auth: true
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
