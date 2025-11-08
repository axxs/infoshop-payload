import type { Block } from 'payload'

export const Hero: Block = {
  slug: 'hero',
  labels: {
    singular: 'Hero Section',
    plural: 'Hero Sections',
  },
  fields: [
    {
      name: 'variant',
      type: 'select',
      required: true,
      defaultValue: 'default',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Minimal', value: 'minimal' },
        { label: 'Full Height', value: 'fullHeight' },
      ],
      admin: {
        description: 'Visual style of the hero section',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Main heading',
      },
    },
    {
      name: 'subtitle',
      type: 'text',
      admin: {
        description: 'Subtitle or description text',
      },
    },
    {
      name: 'backgroundImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Optional background image',
      },
    },
    {
      name: 'icon',
      type: 'select',
      options: [
        { label: 'Book Open', value: 'book-open' },
        { label: 'Library', value: 'library' },
        { label: 'Sparkles', value: 'sparkles' },
        { label: 'None', value: 'none' },
      ],
      defaultValue: 'book-open',
      admin: {
        description: 'Icon to display above the title',
      },
    },
    {
      name: 'ctaButtons',
      type: 'array',
      maxRows: 3,
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'href',
          type: 'text',
          required: true,
          admin: {
            placeholder: '/shop or https://example.com',
          },
        },
        {
          name: 'variant',
          type: 'select',
          required: true,
          defaultValue: 'default',
          options: [
            { label: 'Primary', value: 'default' },
            { label: 'Secondary', value: 'secondary' },
            { label: 'Outline', value: 'outline' },
          ],
        },
      ],
      admin: {
        description: 'Call-to-action buttons (max 3)',
      },
    },
    {
      name: 'alignment',
      type: 'select',
      required: true,
      defaultValue: 'center',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
      admin: {
        description: 'Text alignment',
      },
    },
  ],
}
