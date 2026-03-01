import type { GlobalConfig } from 'payload'
import { publicRead, isAdmin } from '@/lib/access'

export const StoreSettings: GlobalConfig = {
  slug: 'store-settings',
  label: 'Store Settings',
  admin: {
    description: 'Configure payment processing and store behavior',
  },
  access: {
    read: publicRead,
    update: isAdmin,
  },
  fields: [
    {
      name: 'paymentsEnabled',
      type: 'checkbox',
      label: 'Enable Card Payments',
      defaultValue: true,
      admin: {
        description: 'When disabled, customers can submit book inquiries instead of paying online.',
      },
    },
    {
      name: 'paymentsDisabledMessage',
      type: 'textarea',
      maxLength: 500,
      label: 'Payments Disabled Message',
      defaultValue:
        'Online payments are currently unavailable. You can submit an inquiry and we will get back to you.',
      admin: {
        description: 'Shown to customers when payments are disabled.',
        condition: (_data, siblingData) => !siblingData?.paymentsEnabled,
      },
    },
    {
      name: 'squareConfigStatus',
      type: 'ui',
      label: 'Square Configuration Status',
      admin: {
        components: {
          Field: '@/globals/components/SquareConfigStatus#SquareConfigStatus',
        },
      },
    },
  ],
}
