import type { CollectionConfig } from 'payload'
import {
  calculateTotalAmount,
  generateReceiptNumber,
  deductStock,
  validateSaleItems,
} from './Sales/hooks'
import { isAdminOrVolunteer, isAdminOrVolunteerOrSelf } from '@/lib/access'

export const Sales: CollectionConfig = {
  slug: 'sales',
  admin: {
    useAsTitle: 'receiptNumber',
    defaultColumns: ['receiptNumber', 'saleDate', 'status', 'totalAmount', 'customer'],
    description: 'Point of sale transactions and online orders',
  },
  access: {
    read: isAdminOrVolunteerOrSelf('customer'),
    create: isAdminOrVolunteer,
    update: isAdminOrVolunteer,
    delete: isAdminOrVolunteer,
  },
  fields: [
    {
      name: 'receiptNumber',
      type: 'text',
      unique: true,
      admin: {
        description: 'Receipt/invoice number',
        readOnly: true,
      },
    },
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
    // Order Status Tracking
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Pending', value: 'PENDING' },
        { label: 'Processing', value: 'PROCESSING' },
        { label: 'Completed', value: 'COMPLETED' },
        { label: 'Cancelled', value: 'CANCELLED' },
        { label: 'Refunded', value: 'REFUNDED' },
      ],
      defaultValue: 'COMPLETED',
      admin: {
        description: 'Current order status',
        position: 'sidebar',
      },
    },
    {
      name: 'statusHistory',
      type: 'array',
      admin: {
        description: 'Status change history for audit trail',
        readOnly: true,
      },
      fields: [
        {
          name: 'status',
          type: 'select',
          required: true,
          options: [
            { label: 'Pending', value: 'PENDING' },
            { label: 'Processing', value: 'PROCESSING' },
            { label: 'Completed', value: 'COMPLETED' },
            { label: 'Cancelled', value: 'CANCELLED' },
            { label: 'Refunded', value: 'REFUNDED' },
          ],
        },
        {
          name: 'timestamp',
          type: 'date',
          required: true,
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'note',
          type: 'text',
        },
        {
          name: 'changedBy',
          type: 'relationship',
          relationTo: 'users',
        },
      ],
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
    // Customer Information
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Customer account (if registered)',
        position: 'sidebar',
      },
    },
    {
      name: 'customerEmail',
      type: 'email',
      admin: {
        description: 'Customer email (for order notifications)',
        position: 'sidebar',
      },
    },
    {
      name: 'customerName',
      type: 'text',
      admin: {
        description: 'Customer name (for guest orders)',
        position: 'sidebar',
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
    // Cancellation Details
    {
      name: 'cancelledAt',
      type: 'date',
      admin: {
        description: 'Date and time order was cancelled',
        readOnly: true,
        condition: (data) => data.status === 'CANCELLED',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'cancelledBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'User who cancelled the order',
        readOnly: true,
        condition: (data) => data.status === 'CANCELLED',
      },
    },
    {
      name: 'cancellationReason',
      type: 'textarea',
      admin: {
        description: 'Reason for cancellation',
        condition: (data) => data.status === 'CANCELLED',
      },
    },
    // Additional metadata
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Internal notes about this order',
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
