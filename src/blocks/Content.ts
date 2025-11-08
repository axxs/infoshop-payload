import type { Block } from 'payload'

export const Content: Block = {
  slug: 'content',
  labels: {
    singular: 'Content Block',
    plural: 'Content Blocks',
  },
  fields: [
    {
      name: 'layout',
      type: 'select',
      required: true,
      defaultValue: 'oneColumn',
      options: [
        { label: 'One Column', value: 'oneColumn' },
        { label: 'Two Columns', value: 'twoColumns' },
        { label: 'Three Columns', value: 'threeColumns' },
      ],
      admin: {
        description: 'Number of columns in this content block',
      },
    },
    {
      name: 'columns',
      type: 'array',
      minRows: 1,
      maxRows: 3,
      fields: [
        {
          name: 'richText',
          type: 'richText',
          required: true,
          admin: {
            description: 'Column content (supports headings, lists, links, etc.)',
          },
        },
        {
          name: 'align',
          type: 'select',
          defaultValue: 'left',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' },
          ],
        },
      ],
      admin: {
        description: 'Add content columns (number should match layout)',
      },
    },
    {
      name: 'backgroundColor',
      type: 'select',
      defaultValue: 'default',
      options: [
        { label: 'Default (Background)', value: 'default' },
        { label: 'Muted', value: 'muted' },
        { label: 'Primary', value: 'primary' },
      ],
      admin: {
        description: 'Background colour for this section',
      },
    },
  ],
}
