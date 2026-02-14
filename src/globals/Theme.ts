import type { GlobalConfig } from 'payload'

export const Theme: GlobalConfig = {
  slug: 'theme',
  access: {
    read: () => true, // Public read for frontend theme application
    update: ({ req: { user } }) => !!user, // Authenticated users can update
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
          label: 'Active Theme',
          fields: [
            {
              type: 'ui',
              name: 'themeResetButton',
              admin: {
                components: {
                  Field: '@/globals/ThemeResetButton#ThemeResetButton',
                },
              },
            },
            {
              name: 'activeTheme',
              type: 'select',
              required: true,
              defaultValue: 'default',
              admin: {
                description: 'Select the currently active theme for the site',
              },
              options: [
                { label: 'Default (Blue)', value: 'default' },
                { label: 'Radical (Red & Black)', value: 'radical' },
              ],
            },
            {
              name: 'colorMode',
              type: 'select',
              required: true,
              defaultValue: 'auto',
              admin: {
                description: 'Force light or dark mode, or use system preference',
              },
              options: [
                { label: 'Auto (System Preference)', value: 'auto' },
                { label: 'Light Mode Only', value: 'light' },
                { label: 'Dark Mode Only', value: 'dark' },
              ],
            },
          ],
        },
        {
          label: 'Default Theme',
          fields: [
            {
              type: 'collapsible',
              label: 'Light Mode Colours',
              admin: {
                initCollapsed: false,
              },
              fields: [
                {
                  name: 'default_light_primary',
                  type: 'text',
                  defaultValue: '221.2 83.2% 53.3%',
                  admin: {
                    description: 'Primary brand colour (raw HSL values without hsl() wrapper)',
                    placeholder: '221.2 83.2% 53.3%',
                  },
                },
                {
                  name: 'default_light_background',
                  type: 'text',
                  defaultValue: '0 0% 100%',
                  admin: {
                    description: 'Page background colour',
                    placeholder: '0 0% 100%',
                  },
                },
                {
                  name: 'default_light_foreground',
                  type: 'text',
                  defaultValue: '222.2 84% 4.9%',
                  admin: {
                    description: 'Main text colour',
                    placeholder: '222.2 84% 4.9%',
                  },
                },
                {
                  name: 'default_light_card',
                  type: 'text',
                  defaultValue: '0 0% 100%',
                  admin: {
                    description: 'Card background colour',
                  },
                },
                {
                  name: 'default_light_card_foreground',
                  type: 'text',
                  defaultValue: '222.2 84% 4.9%',
                  admin: {
                    description: 'Card text colour',
                  },
                },
                {
                  name: 'default_light_muted',
                  type: 'text',
                  defaultValue: '210 40% 96.1%',
                  admin: {
                    description: 'Muted background colour',
                  },
                },
                {
                  name: 'default_light_muted_foreground',
                  type: 'text',
                  defaultValue: '215.4 16.3% 46.9%',
                  admin: {
                    description: 'Muted text colour',
                  },
                },
                {
                  name: 'default_light_accent',
                  type: 'text',
                  defaultValue: '210 40% 96.1%',
                  admin: {
                    description: 'Accent background colour',
                  },
                },
                {
                  name: 'default_light_accent_foreground',
                  type: 'text',
                  defaultValue: '222.2 47.4% 11.2%',
                  admin: {
                    description: 'Accent text colour',
                  },
                },
                {
                  name: 'default_light_destructive',
                  type: 'text',
                  defaultValue: '0 84.2% 60.2%',
                  admin: {
                    description: 'Destructive/error colour',
                  },
                },
                {
                  name: 'default_light_border',
                  type: 'text',
                  defaultValue: '214.3 31.8% 91.4%',
                  admin: {
                    description: 'Border colour',
                  },
                },
                {
                  name: 'default_light_input',
                  type: 'text',
                  defaultValue: '214.3 31.8% 91.4%',
                  admin: {
                    description: 'Input border colour',
                  },
                },
                {
                  name: 'default_light_ring',
                  type: 'text',
                  defaultValue: '221.2 83.2% 53.3%',
                  admin: {
                    description: 'Focus ring colour',
                  },
                },
                {
                  name: 'default_light_popover',
                  type: 'text',
                  defaultValue: '0 0% 100%',
                  admin: {
                    description: 'Popover background colour',
                  },
                },
                {
                  name: 'default_light_popover_foreground',
                  type: 'text',
                  defaultValue: '222.2 84% 4.9%',
                  admin: {
                    description: 'Popover text colour',
                  },
                },
                {
                  name: 'default_light_secondary',
                  type: 'text',
                  defaultValue: '210 40% 96.1%',
                  admin: {
                    description: 'Secondary background colour',
                  },
                },
                {
                  name: 'default_light_secondary_foreground',
                  type: 'text',
                  defaultValue: '222.2 47.4% 11.2%',
                  admin: {
                    description: 'Secondary text colour',
                  },
                },
                {
                  name: 'default_light_destructive_foreground',
                  type: 'text',
                  defaultValue: '210 40% 98%',
                  admin: {
                    description: 'Destructive/error text colour',
                  },
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'Dark Mode Colours',
              admin: {
                initCollapsed: true,
              },
              fields: [
                {
                  name: 'default_dark_primary',
                  type: 'text',
                  defaultValue: '217.2 91.2% 59.8%',
                  admin: {
                    description: 'Primary brand colour (HSL format)',
                  },
                },
                {
                  name: 'default_dark_background',
                  type: 'text',
                  defaultValue: '222.2 47% 8%',
                  admin: {
                    description: 'Page background colour',
                  },
                },
                {
                  name: 'default_dark_foreground',
                  type: 'text',
                  defaultValue: '210 40% 98%',
                  admin: {
                    description: 'Main text colour',
                  },
                },
                {
                  name: 'default_dark_card',
                  type: 'text',
                  defaultValue: '222.2 47% 11%',
                },
                {
                  name: 'default_dark_card_foreground',
                  type: 'text',
                  defaultValue: '210 40% 98%',
                },
                {
                  name: 'default_dark_muted',
                  type: 'text',
                  defaultValue: '217.2 32.6% 20%',
                },
                {
                  name: 'default_dark_muted_foreground',
                  type: 'text',
                  defaultValue: '215 20.2% 70%',
                },
                {
                  name: 'default_dark_accent',
                  type: 'text',
                  defaultValue: '217.2 32.6% 20%',
                },
                {
                  name: 'default_dark_accent_foreground',
                  type: 'text',
                  defaultValue: '210 40% 98%',
                },
                {
                  name: 'default_dark_destructive',
                  type: 'text',
                  defaultValue: '0 62.8% 50%',
                },
                {
                  name: 'default_dark_border',
                  type: 'text',
                  defaultValue: '217.2 32.6% 25%',
                },
                {
                  name: 'default_dark_input',
                  type: 'text',
                  defaultValue: '217.2 32.6% 25%',
                  admin: {
                    description: 'Input border colour',
                  },
                },
                {
                  name: 'default_dark_ring',
                  type: 'text',
                  defaultValue: '217.2 91.2% 59.8%',
                  admin: {
                    description: 'Focus ring colour',
                  },
                },
                {
                  name: 'default_dark_popover',
                  type: 'text',
                  defaultValue: '222.2 47% 11%',
                  admin: {
                    description: 'Popover background colour',
                  },
                },
                {
                  name: 'default_dark_popover_foreground',
                  type: 'text',
                  defaultValue: '210 40% 98%',
                  admin: {
                    description: 'Popover text colour',
                  },
                },
                {
                  name: 'default_dark_secondary',
                  type: 'text',
                  defaultValue: '217.2 32.6% 20%',
                  admin: {
                    description: 'Secondary background colour',
                  },
                },
                {
                  name: 'default_dark_secondary_foreground',
                  type: 'text',
                  defaultValue: '210 40% 98%',
                  admin: {
                    description: 'Secondary text colour',
                  },
                },
                {
                  name: 'default_dark_destructive_foreground',
                  type: 'text',
                  defaultValue: '210 40% 98%',
                  admin: {
                    description: 'Destructive/error text colour',
                  },
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'Typography',
              admin: {
                initCollapsed: true,
              },
              fields: [
                {
                  name: 'default_fontFamily',
                  type: 'text',
                  defaultValue: 'system-ui, sans-serif',
                  admin: {
                    description: 'Main font family',
                    placeholder: 'system-ui, sans-serif',
                  },
                },
                {
                  name: 'default_headingFontFamily',
                  type: 'text',
                  defaultValue: 'system-ui, sans-serif',
                  admin: {
                    description: 'Heading font family',
                    placeholder: 'system-ui, sans-serif',
                  },
                },
                {
                  name: 'default_radius',
                  type: 'text',
                  defaultValue: '0.5rem',
                  admin: {
                    description: 'Border radius for components',
                    placeholder: '0.5rem',
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Shop Settings',
          fields: [
            {
              name: 'showOutOfStockBooks',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description:
                  'Display out-of-stock books on the shop page (will show "Out of Stock" badge)',
              },
            },
            {
              name: 'showUnpricedBooks',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description:
                  'Display books without pricing on the shop page (will show "Price on request" with contact link)',
              },
            },
            {
              name: 'contactEmail',
              type: 'email',
              admin: {
                description: 'Email address for "Contact Us" links on unpriced/out-of-stock books',
                placeholder: 'shop@example.com',
              },
            },
            {
              name: 'contactPageUrl',
              type: 'text',
              admin: {
                description:
                  'URL for contact page (optional - if set, will link to this page instead of email)',
                placeholder: '/contact',
              },
            },
          ],
        },
        {
          label: 'Radical Theme',
          fields: [
            {
              type: 'collapsible',
              label: 'Light Mode Colours',
              admin: {
                initCollapsed: false,
              },
              fields: [
                {
                  name: 'radical_light_primary',
                  type: 'text',
                  defaultValue: '0 84% 60%',
                  admin: {
                    description: 'Bold red primary colour',
                  },
                },
                {
                  name: 'radical_light_background',
                  type: 'text',
                  defaultValue: '43 100% 98%',
                  admin: {
                    description: 'Warm off-white background',
                  },
                },
                {
                  name: 'radical_light_foreground',
                  type: 'text',
                  defaultValue: '0 0% 10%',
                  admin: {
                    description: 'Near black text',
                  },
                },
                {
                  name: 'radical_light_card',
                  type: 'text',
                  defaultValue: '0 0% 100%',
                },
                {
                  name: 'radical_light_card_foreground',
                  type: 'text',
                  defaultValue: '0 0% 10%',
                },
                {
                  name: 'radical_light_muted',
                  type: 'text',
                  defaultValue: '43 30% 90%',
                },
                {
                  name: 'radical_light_muted_foreground',
                  type: 'text',
                  defaultValue: '0 0% 40%',
                },
                {
                  name: 'radical_light_accent',
                  type: 'text',
                  defaultValue: '43 100% 85%',
                },
                {
                  name: 'radical_light_accent_foreground',
                  type: 'text',
                  defaultValue: '0 0% 10%',
                },
                {
                  name: 'radical_light_destructive',
                  type: 'text',
                  defaultValue: '0 84% 60%',
                },
                {
                  name: 'radical_light_border',
                  type: 'text',
                  defaultValue: '0 0% 20%',
                },
                {
                  name: 'radical_light_input',
                  type: 'text',
                  defaultValue: '0 0% 20%',
                  admin: {
                    description: 'Input border colour',
                  },
                },
                {
                  name: 'radical_light_ring',
                  type: 'text',
                  defaultValue: '0 84% 60%',
                  admin: {
                    description: 'Focus ring colour',
                  },
                },
                {
                  name: 'radical_light_popover',
                  type: 'text',
                  defaultValue: '0 0% 100%',
                  admin: {
                    description: 'Popover background colour',
                  },
                },
                {
                  name: 'radical_light_popover_foreground',
                  type: 'text',
                  defaultValue: '0 0% 10%',
                  admin: {
                    description: 'Popover text colour',
                  },
                },
                {
                  name: 'radical_light_secondary',
                  type: 'text',
                  defaultValue: '43 30% 90%',
                  admin: {
                    description: 'Secondary background colour',
                  },
                },
                {
                  name: 'radical_light_secondary_foreground',
                  type: 'text',
                  defaultValue: '0 0% 10%',
                  admin: {
                    description: 'Secondary text colour',
                  },
                },
                {
                  name: 'radical_light_destructive_foreground',
                  type: 'text',
                  defaultValue: '0 0% 100%',
                  admin: {
                    description: 'Destructive/error text colour',
                  },
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'Dark Mode Colours',
              admin: {
                initCollapsed: true,
              },
              fields: [
                {
                  name: 'radical_dark_primary',
                  type: 'text',
                  defaultValue: '0 90% 65%',
                  admin: {
                    description: 'Brighter red for dark mode',
                  },
                },
                {
                  name: 'radical_dark_background',
                  type: 'text',
                  defaultValue: '0 0% 8%',
                  admin: {
                    description: 'Very dark grey',
                  },
                },
                {
                  name: 'radical_dark_foreground',
                  type: 'text',
                  defaultValue: '43 100% 95%',
                  admin: {
                    description: 'Warm white',
                  },
                },
                {
                  name: 'radical_dark_card',
                  type: 'text',
                  defaultValue: '0 0% 12%',
                },
                {
                  name: 'radical_dark_card_foreground',
                  type: 'text',
                  defaultValue: '43 100% 95%',
                },
                {
                  name: 'radical_dark_muted',
                  type: 'text',
                  defaultValue: '0 5% 15%',
                },
                {
                  name: 'radical_dark_muted_foreground',
                  type: 'text',
                  defaultValue: '43 20% 70%',
                },
                {
                  name: 'radical_dark_accent',
                  type: 'text',
                  defaultValue: '0 10% 20%',
                },
                {
                  name: 'radical_dark_accent_foreground',
                  type: 'text',
                  defaultValue: '43 100% 95%',
                },
                {
                  name: 'radical_dark_destructive',
                  type: 'text',
                  defaultValue: '0 90% 65%',
                },
                {
                  name: 'radical_dark_border',
                  type: 'text',
                  defaultValue: '0 5% 25%',
                },
                {
                  name: 'radical_dark_input',
                  type: 'text',
                  defaultValue: '0 5% 25%',
                  admin: {
                    description: 'Input border colour',
                  },
                },
                {
                  name: 'radical_dark_ring',
                  type: 'text',
                  defaultValue: '0 90% 65%',
                  admin: {
                    description: 'Focus ring colour',
                  },
                },
                {
                  name: 'radical_dark_popover',
                  type: 'text',
                  defaultValue: '0 0% 12%',
                  admin: {
                    description: 'Popover background colour',
                  },
                },
                {
                  name: 'radical_dark_popover_foreground',
                  type: 'text',
                  defaultValue: '43 100% 95%',
                  admin: {
                    description: 'Popover text colour',
                  },
                },
                {
                  name: 'radical_dark_secondary',
                  type: 'text',
                  defaultValue: '0 5% 15%',
                  admin: {
                    description: 'Secondary background colour',
                  },
                },
                {
                  name: 'radical_dark_secondary_foreground',
                  type: 'text',
                  defaultValue: '43 100% 95%',
                  admin: {
                    description: 'Secondary text colour',
                  },
                },
                {
                  name: 'radical_dark_destructive_foreground',
                  type: 'text',
                  defaultValue: '43 100% 95%',
                  admin: {
                    description: 'Destructive/error text colour',
                  },
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'Typography',
              admin: {
                initCollapsed: true,
              },
              fields: [
                {
                  name: 'radical_fontFamily',
                  type: 'text',
                  defaultValue: 'Georgia, serif',
                  admin: {
                    description: 'Serif font for radical aesthetic',
                  },
                },
                {
                  name: 'radical_headingFontFamily',
                  type: 'text',
                  defaultValue: 'Impact, sans-serif',
                  admin: {
                    description: 'Bold sans-serif for headings',
                  },
                },
                {
                  name: 'radical_radius',
                  type: 'text',
                  defaultValue: '0rem',
                  admin: {
                    description: 'Sharp corners for edgy look',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
