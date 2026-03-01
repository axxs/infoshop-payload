import type { CollectionConfig } from 'payload'
import { isAdminOrVolunteer } from '@/lib/access'

export const Inquiries: CollectionConfig = {
  slug: 'inquiries',
  admin: {
    useAsTitle: 'customerName',
    defaultColumns: ['customerName', 'customerEmail', 'status', 'createdAt'],
    description: 'Book inquiries submitted when online payments are disabled',
  },
  access: {
    read: isAdminOrVolunteer,
    create: () => true,
    update: isAdminOrVolunteer,
    delete: isAdminOrVolunteer,
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
