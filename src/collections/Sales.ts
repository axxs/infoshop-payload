import type { CollectionConfig } from 'payload'
import {
  calculateTotalAmount,
  generateReceiptNumber,
  deductStock,
  validateSaleItems,
} from './Sales/hooks'

export const Sales: CollectionConfig = {
  slug: 'sales',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['saleDate', 'totalAmount', 'paymentMethod', 'customer'],
    description: 'Point of sale transactions',
  },
  access: {
    read: ({ req: { user } }) => !!user, // Only authenticated users can view sales
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    {
      name: 'saleDate',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        description: 'Date and time of sale',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'totalAmount',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Total sale amount (calculated from items)',
        step: 0.01,
        readOnly: true, // Calculated field
      },
    },
    {
      name: 'paymentMethod',
      type: 'select',
      required: true,
      options: [
        { label: 'Cash', value: 'CASH' },
        { label: 'Card', value: 'CARD' },
        { label: 'Square', value: 'SQUARE' },
        { label: 'Member Credit', value: 'MEMBER_CREDIT' },
        { label: 'Other', value: 'OTHER' },
      ],
      defaultValue: 'CASH',
    },
    // Square Integration
    {
      name: 'squareTransactionId',
      type: 'text',
      admin: {
        description: 'Square transaction ID (for Square payments)',
        readOnly: true,
        condition: (data) => data.paymentMethod === 'SQUARE',
      },
    },
    {
      name: 'squareReceiptUrl',
      type: 'text',
      admin: {
        description: 'Square receipt URL',
        readOnly: true,
        condition: (data) => data.paymentMethod === 'SQUARE',
      },
    },
    // Customer/User relationship (optional - for registered customers)
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Customer who made the purchase (if registered)',
      },
    },
    // Sale items (line items)
    {
      name: 'items',
      type: 'relationship',
      relationTo: 'sale-items',
      hasMany: true,
      required: true,
      admin: {
        description: 'Items included in this sale',
      },
    },
    // Additional metadata
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Internal notes about this sale',
      },
    },
    {
      name: 'receiptNumber',
      type: 'text',
      unique: true,
      admin: {
        description: 'Receipt/invoice number',
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeValidate: [validateSaleItems],
    beforeChange: [generateReceiptNumber, calculateTotalAmount],
    afterChange: [deductStock],
  },
  timestamps: true,
}
