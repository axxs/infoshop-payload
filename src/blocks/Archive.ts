import type { Block } from 'payload'

export const Archive: Block = {
  slug: 'archive',
  labels: {
    singular: 'Archive',
    plural: 'Archives',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: {
        description: 'Optional section heading',
      },
    },
    {
      name: 'collection',
      type: 'select',
      required: true,
      defaultValue: 'books',
      options: [
        { label: 'Books', value: 'books' },
        { label: 'Events', value: 'events' },
      ],
      admin: {
        description: 'Which collection to display',
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      admin: {
        condition: (data) => data.collection === 'books',
        description: 'Filter books by category',
      },
    },
    {
      name: 'subject',
      type: 'relationship',
      relationTo: 'subjects',
      admin: {
        condition: (data) => data.collection === 'books',
        description: 'Filter books by subject',
      },
    },
    {
      name: 'dateRange',
      type: 'group',
      fields: [
        {
          name: 'start',
          type: 'date',
          admin: {
            description: 'Filter events starting from this date',
          },
        },
        {
          name: 'end',
          type: 'date',
          admin: {
            description: 'Filter events until this date',
          },
        },
      ],
      admin: {
        condition: (data) => data.collection === 'events',
        description: 'Date range for events',
      },
    },
    {
      name: 'layout',
      type: 'select',
      required: true,
      defaultValue: 'grid',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'List', value: 'list' },
      ],
      admin: {
        description: 'Display layout',
      },
    },
    {
      name: 'enableSearch',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Show search bar above archive',
      },
    },
    {
      name: 'enableFilters',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Show filter controls',
      },
    },
    {
      name: 'itemsPerPage',
      type: 'number',
      required: true,
      defaultValue: 12,
      min: 4,
      max: 48,
      admin: {
        description: 'Number of items per page',
      },
    },
  ],
}
