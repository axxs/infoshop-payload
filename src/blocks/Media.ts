import type { Block } from 'payload'

export const Media: Block = {
  slug: 'media',
  labels: {
    singular: 'Media Block',
    plural: 'Media Blocks',
  },
  fields: [
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: {
        description: 'Image or video to display',
      },
    },
    {
      name: 'caption',
      type: 'richText',
      admin: {
        description: 'Optional caption below the media',
      },
    },
    {
      name: 'size',
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: [
        { label: 'Small', value: 'small' },
        { label: 'Medium', value: 'medium' },
        { label: 'Large', value: 'large' },
        { label: 'Full Width', value: 'fullWidth' },
      ],
      admin: {
        description: 'Display size of the media',
      },
    },
    {
      name: 'aspectRatio',
      type: 'select',
      defaultValue: 'auto',
      options: [
        { label: 'Auto', value: 'auto' },
        { label: '16:9', value: '16:9' },
        { label: '4:3', value: '4:3' },
        { label: '1:1', value: '1:1' },
      ],
      admin: {
        description: 'Aspect ratio (auto uses original dimensions)',
      },
    },
  ],
}
