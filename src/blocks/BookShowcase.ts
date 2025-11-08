import type { Block } from 'payload'

export const BookShowcase: Block = {
  slug: 'bookShowcase',
  labels: {
    singular: 'Book Showcase',
    plural: 'Book Showcases',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      defaultValue: 'Featured Books',
      admin: {
        description: 'Section heading',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Optional description text below heading',
      },
    },
    {
      name: 'displayMode',
      type: 'select',
      required: true,
      defaultValue: 'newest',
      options: [
        { label: 'Newest Books', value: 'newest' },
        { label: 'Featured Books', value: 'featured' },
        { label: 'By Category', value: 'category' },
        { label: 'By Subject', value: 'subject' },
        { label: 'Manual Selection', value: 'manual' },
      ],
      admin: {
        description: 'How to select books to display',
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      admin: {
        condition: (data) => data.displayMode === 'category',
        description: 'Filter books by this category',
      },
    },
    {
      name: 'subject',
      type: 'relationship',
      relationTo: 'subjects',
      admin: {
        condition: (data) => data.displayMode === 'subject',
        description: 'Filter books by this subject',
      },
    },
    {
      name: 'manualBooks',
      type: 'relationship',
      relationTo: 'books',
      hasMany: true,
      admin: {
        condition: (data) => data.displayMode === 'manual',
        description: 'Manually select specific books',
      },
    },
    {
      name: 'limit',
      type: 'number',
      required: true,
      defaultValue: 8,
      min: 1,
      max: 24,
      admin: {
        condition: (data) => data.displayMode !== 'manual',
        description: 'Number of books to display',
      },
    },
    {
      name: 'columns',
      type: 'select',
      required: true,
      defaultValue: '4',
      options: [
        { label: '2 Columns', value: '2' },
        { label: '3 Columns', value: '3' },
        { label: '4 Columns', value: '4' },
      ],
      admin: {
        description: 'Grid layout columns (desktop)',
      },
    },
    {
      name: 'showViewAllLink',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Show "View All" link',
      },
    },
    {
      name: 'viewAllHref',
      type: 'text',
      defaultValue: '/shop',
      admin: {
        condition: (data) => data.showViewAllLink === true,
        description: 'Link destination for "View All" button',
        placeholder: '/shop',
      },
    },
  ],
}
