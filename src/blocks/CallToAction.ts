import type { Block } from 'payload'

export const CallToAction: Block = {
  slug: 'callToAction',
  labels: {
    singular: 'Call to Action',
    plural: 'Calls to Action',
  },
  fields: [
    {
      name: 'icon',
      type: 'select',
      options: [
        { label: 'Book Open', value: 'book-open' },
        { label: 'Tag', value: 'tag' },
        { label: 'Grid 3x3', value: 'grid-3x3' },
        { label: 'Calendar', value: 'calendar' },
        { label: 'Info', value: 'info' },
        { label: 'Custom Image', value: 'custom' },
      ],
      defaultValue: 'info',
      admin: {
        description: 'Icon to display',
      },
    },
    {
      name: 'customIcon',
      type: 'upload',
      relationTo: 'media',
      admin: {
        condition: (data) => data.icon === 'custom',
        description: 'Upload a custom icon image',
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
      name: 'description',
      type: 'richText',
      required: true,
      admin: {
        description: 'Description text',
      },
    },
    {
      name: 'buttons',
      type: 'array',
      minRows: 1,
      maxRows: 2,
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
            { label: 'Outline', value: 'outline' },
          ],
        },
        {
          name: 'size',
          type: 'select',
          required: true,
          defaultValue: 'default',
          options: [
            { label: 'Default', value: 'default' },
            { label: 'Large', value: 'lg' },
          ],
        },
      ],
      admin: {
        description: 'Call-to-action buttons (1-2 max)',
      },
    },
    {
      name: 'backgroundColor',
      type: 'select',
      required: true,
      defaultValue: 'default',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Muted', value: 'muted' },
        { label: 'Gradient', value: 'gradient' },
      ],
      admin: {
        description: 'Background style',
      },
    },
  ],
}
