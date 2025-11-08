import type { GlobalConfig } from 'payload'
import { blocks } from '@/blocks'

export const Layout: GlobalConfig = {
  slug: 'layout',
  access: {
    read: () => true, // Public read for frontend rendering
    update: ({ req: { user } }) => !!user, // Only authenticated users can edit layout
  },
  admin: {
    livePreview: {
      url: () => {
        return `${process.env.NEXT_PUBLIC_SERVER_URL}/`
      },
    },
  },
  versions: {
    drafts: true,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Header',
          fields: [
            {
              name: 'logo',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description: 'Site logo (recommended: SVG or PNG with transparency)',
              },
            },
            {
              name: 'navigation',
              type: 'array',
              maxRows: 8,
              fields: [
                {
                  name: 'label',
                  type: 'text',
                  required: true,
                  admin: {
                    placeholder: 'Shop',
                  },
                },
                {
                  name: 'href',
                  type: 'text',
                  required: true,
                  admin: {
                    placeholder: '/shop',
                  },
                },
                {
                  name: 'children',
                  type: 'array',
                  maxRows: 6,
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
                    },
                  ],
                  admin: {
                    description: 'Optional dropdown menu items',
                  },
                },
              ],
              admin: {
                description: 'Main navigation links',
              },
            },
            {
              name: 'ctaButton',
              type: 'group',
              fields: [
                {
                  name: 'label',
                  type: 'text',
                  admin: {
                    placeholder: 'Get Started',
                  },
                },
                {
                  name: 'href',
                  type: 'text',
                  admin: {
                    placeholder: '/events',
                  },
                },
              ],
              admin: {
                description: 'Optional call-to-action button in header',
              },
            },
          ],
        },
        {
          label: 'Footer',
          fields: [
            {
              name: 'columns',
              type: 'array',
              minRows: 1,
              maxRows: 4,
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  required: true,
                  admin: {
                    placeholder: 'Quick Links',
                  },
                },
                {
                  name: 'links',
                  type: 'array',
                  maxRows: 10,
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
                    },
                  ],
                },
              ],
              admin: {
                description: 'Footer columns with links',
              },
            },
            {
              name: 'socialLinks',
              type: 'array',
              maxRows: 6,
              fields: [
                {
                  name: 'platform',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Facebook', value: 'facebook' },
                    { label: 'Twitter', value: 'twitter' },
                    { label: 'Instagram', value: 'instagram' },
                    { label: 'LinkedIn', value: 'linkedin' },
                    { label: 'GitHub', value: 'github' },
                    { label: 'YouTube', value: 'youtube' },
                  ],
                },
                {
                  name: 'url',
                  type: 'text',
                  required: true,
                  admin: {
                    placeholder: 'https://twitter.com/infoshop',
                  },
                },
              ],
              admin: {
                description: 'Social media links',
              },
            },
            {
              name: 'copyright',
              type: 'text',
              defaultValue: '© 2025 Infoshop. All rights reserved.',
              admin: {
                description: 'Copyright text',
              },
            },
          ],
        },
        {
          label: 'Homepage',
          fields: [
            {
              name: 'blocks',
              type: 'blocks',
              blocks,
              admin: {
                description: 'Build the homepage layout by adding, removing, and reordering blocks',
              },
            },
          ],
        },
      ],
    },
  ],
}
