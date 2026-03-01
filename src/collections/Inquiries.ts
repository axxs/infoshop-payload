import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import { isAdminOrVolunteer } from '@/lib/access'
import { APIError } from 'payload'

/**
 * Block inquiry creation when payments are enabled.
 * This guards the REST/GraphQL API — the server action has its own check,
 * but direct POST to /api/inquiries would bypass it without this hook.
 */
const enforcePaymentsDisabled: CollectionBeforeChangeHook = async ({ operation, req }) => {
  if (operation !== 'create') return
  try {
    const settings = await req.payload.findGlobal({ slug: 'store-settings' })
    if (settings.paymentsEnabled !== false) {
      throw new APIError('Inquiries are not accepted when online payments are enabled.', 403)
    }
  } catch (error) {
    // Re-throw APIError, swallow findGlobal failures (default: payments enabled)
    if (error instanceof APIError) throw error
    throw new APIError('Inquiries are not accepted when online payments are enabled.', 403)
  }
}

export const Inquiries: CollectionConfig = {
  slug: 'inquiries',
  admin: {
    useAsTitle: 'customerName',
    defaultColumns: ['customerName', 'customerEmail', 'status', 'createdAt'],
    description: 'Book inquiries submitted when online payments are disabled',
  },
  access: {
    read: isAdminOrVolunteer,
    // Public so anonymous visitors can submit inquiries via the server action.
    create: () => true,
    update: isAdminOrVolunteer,
    delete: isAdminOrVolunteer,
  },
  hooks: {
    beforeChange: [enforcePaymentsDisabled],
  },
  timestamps: true,
  fields: [
    {
      name: 'customerName',
      type: 'text',
      required: true,
      maxLength: 200,
      label: 'Customer Name',
    },
    {
      name: 'customerEmail',
      type: 'email',
      required: true,
      label: 'Customer Email',
    },
    {
      name: 'message',
      type: 'textarea',
      maxLength: 2000,
      label: 'Message',
      admin: {
        description: 'Optional message from the customer',
      },
    },
    {
      name: 'items',
      type: 'array',
      label: 'Requested Books',
      minRows: 1,
      fields: [
        {
          name: 'book',
          type: 'relationship',
          relationTo: 'books',
          label: 'Book',
        },
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Title',
          admin: {
            description: 'Snapshot of book title at inquiry time',
          },
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          label: 'Quantity',
          min: 1,
          defaultValue: 1,
        },
        {
          name: 'price',
          type: 'number',
          label: 'Price',
          admin: {
            description: 'Snapshot of price at inquiry time',
          },
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Resolved', value: 'resolved' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'staffNotes',
      type: 'textarea',
      label: 'Staff Notes',
      admin: {
        description: 'Internal notes (not visible to customers)',
        position: 'sidebar',
      },
    },
  ],
}
