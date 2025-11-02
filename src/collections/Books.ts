import type { CollectionConfig } from 'payload'
import {
  validateStock,
  validatePricing,
  validateISBNFormat,
  calculateStockStatus,
  checkLowStock,
  validateDigitalProduct,
} from './Books/hooks'

export const Books: CollectionConfig = {
  slug: 'books',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'isbn', 'costPrice', 'sellPrice', 'memberPrice', 'stockQuantity'],
  },
  access: {
    read: () => true, // Public read access for storefront
    create: ({ req: { user } }) => !!user, // Authenticated users (volunteers) can create
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'isbn',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description: 'ISBN-10 or ISBN-13',
      },
    },
    {
      name: 'oclcNumber',
      type: 'text',
      index: true,
      admin: {
        description: 'OCLC number for library cataloguing',
      },
    },
    {
      name: 'author',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'publisher',
      type: 'text',
    },
    {
      name: 'publishedDate',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'description',
      type: 'richText',
    },
    // Three-Tier Pricing Model
    {
      name: 'costPrice',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Wholesale cost price (what we paid)',
        step: 0.01,
      },
    },
    {
      name: 'sellPrice',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Standard retail price for general public',
        step: 0.01,
      },
    },
    {
      name: 'memberPrice',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Discounted price for collective members',
        step: 0.01,
      },
    },
    {
      name: 'currency',
      type: 'select',
      required: true,
      defaultValue: 'USD',
      options: [
        { label: 'USD - US Dollar', value: 'USD' },
        { label: 'EUR - Euro', value: 'EUR' },
        { label: 'GBP - British Pound', value: 'GBP' },
      ],
    },
    // Inventory Management
    {
      name: 'stockQuantity',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      admin: {
        description: 'Current stock quantity',
      },
    },
    {
      name: 'reorderLevel',
      type: 'number',
      defaultValue: 5,
      min: 0,
      admin: {
        description: 'Alert when stock falls below this level',
      },
    },
    {
      name: 'stockStatus',
      type: 'select',
      required: true,
      defaultValue: 'IN_STOCK',
      options: [
        { label: 'In Stock', value: 'IN_STOCK' },
        { label: 'Low Stock', value: 'LOW_STOCK' },
        { label: 'Out of Stock', value: 'OUT_OF_STOCK' },
        { label: 'Discontinued', value: 'DISCONTINUED' },
      ],
      admin: {
        description: 'Auto-calculated based on stock quantity (or set to Discontinued manually)',
      },
    },
    // Categorisation
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: {
        description: 'Primary categories (hierarchical)',
      },
    },
    {
      name: 'subjects',
      type: 'relationship',
      relationTo: 'subjects',
      hasMany: true,
      admin: {
        description: 'Subject tags (flexible)',
      },
    },
    // Media
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Book cover image',
      },
    },
    {
      name: 'externalCoverUrl',
      type: 'text',
      admin: {
        description: 'External cover image URL (e.g., from Open Library)',
      },
    },
    // Digital Downloads
    {
      name: 'isDigital',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Is this a digital/downloadable product?',
      },
    },
    {
      name: 'digitalFile',
      type: 'upload',
      relationTo: 'media',
      admin: {
        condition: (data) => data.isDigital === true,
        description: 'Digital file for download (PDF, EPUB, etc.)',
      },
    },
    // Square Integration
    {
      name: 'squareCatalogObjectId',
      type: 'text',
      admin: {
        description: 'Square catalog object ID for sync',
        readOnly: true,
      },
    },
    {
      name: 'squareLastSyncedAt',
      type: 'date',
      admin: {
        description: 'Last Square sync timestamp',
        readOnly: true,
      },
    },
    // Supplier
    {
      name: 'supplier',
      type: 'relationship',
      relationTo: 'suppliers',
      admin: {
        description: 'Where we source this book from',
      },
    },
    // Metadata
    {
      name: 'pages',
      type: 'number',
      min: 0,
    },
    {
      name: 'format',
      type: 'select',
      options: [
        { label: 'Hardcover', value: 'HARDCOVER' },
        { label: 'Paperback', value: 'PAPERBACK' },
        { label: 'E-book', value: 'EBOOK' },
        { label: 'Audiobook', value: 'AUDIOBOOK' },
        { label: 'Zine', value: 'ZINE' },
        { label: 'Pamphlet', value: 'PAMPHLET' },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      validateStock,
      validatePricing,
      validateISBNFormat,
      validateDigitalProduct,
      calculateStockStatus,
    ],
    afterChange: [checkLowStock],
  },
}
