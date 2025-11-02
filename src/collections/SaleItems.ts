import type { CollectionConfig } from 'payload'
import {
  calculateLineTotal,
  validateStockAvailability,
  setUnitPriceFromBook,
} from './SaleItems/hooks'

export const SaleItems: CollectionConfig = {
  slug: 'sale-items',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['book', 'quantity', 'unitPrice', 'lineTotal'],
    description: 'Individual line items for sales',
    hidden: true, // Hide from main navigation (accessed via Sales)
  },
  access: {
    read: ({ req: { user } }) => !!user,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    {
      name: 'book',
      type: 'relationship',
      relationTo: 'books',
      required: true,
      admin: {
        description: 'Book being sold',
      },
    },
    {
      name: 'quantity',
      type: 'number',
      required: true,
      min: 1,
      defaultValue: 1,
      admin: {
        description: 'Quantity sold',
      },
    },
    {
      name: 'unitPrice',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Price per unit at time of sale',
        step: 0.01,
      },
    },
    {
      name: 'discount',
      type: 'number',
      min: 0,
      defaultValue: 0,
      admin: {
        description: 'Discount amount applied to this item',
        step: 0.01,
      },
    },
    {
      name: 'lineTotal',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Total for this line item (quantity × unitPrice - discount)',
        step: 0.01,
        readOnly: true, // Calculated field
      },
    },
    {
      name: 'priceType',
      type: 'select',
      required: true,
      options: [
        { label: 'Retail Price', value: 'RETAIL' },
        { label: 'Member Price', value: 'MEMBER' },
        { label: 'Custom Price', value: 'CUSTOM' },
      ],
      defaultValue: 'RETAIL',
      admin: {
        description: 'Price tier used for this sale',
      },
    },
  ],
  hooks: {
    beforeValidate: [validateStockAvailability],
    beforeChange: [setUnitPriceFromBook, calculateLineTotal],
  },
  timestamps: true,
}
