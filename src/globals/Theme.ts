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
                  defaultValue: 'hsl(221.2 83.2% 53.3%)',
                  admin: {
                    description: 'Primary brand colour (HSL format)',
                    placeholder: 'hsl(221.2 83.2% 53.3%)',
                  },
                },
                {
                  name: 'default_light_background',
                  type: 'text',
                  defaultValue: 'hsl(0 0% 100%)',
                  admin: {
                    description: 'Page background colour',
                    placeholder: 'hsl(0 0% 100%)',
                  },
                },
                {
                  name: 'default_light_foreground',
                  type: 'text',
                  defaultValue: 'hsl(222.2 84% 4.9%)',
                  admin: {
                    description: 'Main text colour',
                    placeholder: 'hsl(222.2 84% 4.9%)',
                  },
                },
                {
                  name: 'default_light_card',
                  type: 'text',
                  defaultValue: 'hsl(0 0% 100%)',
                  admin: {
                    description: 'Card background colour',
                  },
                },
                {
                  name: 'default_light_card_foreground',
                  type: 'text',
                  defaultValue: 'hsl(222.2 84% 4.9%)',
                  admin: {
                    description: 'Card text colour',
                  },
                },
                {
                  name: 'default_light_muted',
                  type: 'text',
                  defaultValue: 'hsl(210 40% 96.1%)',
                  admin: {
                    description: 'Muted background colour',
                  },
                },
                {
                  name: 'default_light_muted_foreground',
                  type: 'text',
                  defaultValue: 'hsl(215.4 16.3% 46.9%)',
                  admin: {
                    description: 'Muted text colour',
                  },
                },
                {
                  name: 'default_light_accent',
                  type: 'text',
                  defaultValue: 'hsl(210 40% 96.1%)',
                  admin: {
                    description: 'Accent background colour',
                  },
                },
                {
                  name: 'default_light_accent_foreground',
                  type: 'text',
                  defaultValue: 'hsl(222.2 47.4% 11.2%)',
                  admin: {
                    description: 'Accent text colour',
                  },
                },
                {
                  name: 'default_light_destructive',
                  type: 'text',
                  defaultValue: 'hsl(0 84.2% 60.2%)',
                  admin: {
                    description: 'Destructive/error colour',
                  },
                },
                {
                  name: 'default_light_border',
                  type: 'text',
                  defaultValue: 'hsl(214.3 31.8% 91.4%)',
                  admin: {
                    description: 'Border colour',
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
                  defaultValue: 'hsl(217.2 91.2% 59.8%)',
                  admin: {
                    description: 'Primary brand colour (HSL format)',
                  },
                },
                {
                  name: 'default_dark_background',
                  type: 'text',
                  defaultValue: 'hsl(222.2 84% 4.9%)',
                  admin: {
                    description: 'Page background colour',
                  },
                },
                {
                  name: 'default_dark_foreground',
                  type: 'text',
                  defaultValue: 'hsl(210 40% 98%)',
                  admin: {
                    description: 'Main text colour',
                  },
                },
                {
                  name: 'default_dark_card',
                  type: 'text',
                  defaultValue: 'hsl(222.2 84% 4.9%)',
                },
                {
                  name: 'default_dark_card_foreground',
                  type: 'text',
                  defaultValue: 'hsl(210 40% 98%)',
                },
                {
                  name: 'default_dark_muted',
                  type: 'text',
                  defaultValue: 'hsl(217.2 32.6% 17.5%)',
                },
                {
                  name: 'default_dark_muted_foreground',
                  type: 'text',
                  defaultValue: 'hsl(215 20.2% 65.1%)',
                },
                {
                  name: 'default_dark_accent',
                  type: 'text',
                  defaultValue: 'hsl(217.2 32.6% 17.5%)',
                },
                {
                  name: 'default_dark_accent_foreground',
                  type: 'text',
                  defaultValue: 'hsl(210 40% 98%)',
                },
                {
                  name: 'default_dark_destructive',
                  type: 'text',
                  defaultValue: 'hsl(0 62.8% 30.6%)',
                },
                {
                  name: 'default_dark_border',
                  type: 'text',
                  defaultValue: 'hsl(217.2 32.6% 17.5%)',
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
                  defaultValue: 'hsl(0 84% 60%)',
                  admin: {
                    description: 'Bold red primary colour',
                  },
                },
                {
                  name: 'radical_light_background',
                  type: 'text',
                  defaultValue: 'hsl(43 100% 98%)',
                  admin: {
                    description: 'Warm off-white background',
                  },
                },
                {
                  name: 'radical_light_foreground',
                  type: 'text',
                  defaultValue: 'hsl(0 0% 10%)',
                  admin: {
                    description: 'Near black text',
                  },
                },
                {
                  name: 'radical_light_card',
                  type: 'text',
                  defaultValue: 'hsl(0 0% 100%)',
                },
                {
                  name: 'radical_light_card_foreground',
                  type: 'text',
                  defaultValue: 'hsl(0 0% 10%)',
                },
                {
                  name: 'radical_light_muted',
                  type: 'text',
                  defaultValue: 'hsl(43 30% 90%)',
                },
                {
                  name: 'radical_light_muted_foreground',
                  type: 'text',
                  defaultValue: 'hsl(0 0% 40%)',
                },
                {
                  name: 'radical_light_accent',
                  type: 'text',
                  defaultValue: 'hsl(43 100% 85%)',
                },
                {
                  name: 'radical_light_accent_foreground',
                  type: 'text',
                  defaultValue: 'hsl(0 0% 10%)',
                },
                {
                  name: 'radical_light_destructive',
                  type: 'text',
                  defaultValue: 'hsl(0 84% 60%)',
                },
                {
                  name: 'radical_light_border',
                  type: 'text',
                  defaultValue: 'hsl(0 0% 20%)',
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
                  defaultValue: 'hsl(0 90% 65%)',
                  admin: {
                    description: 'Brighter red for dark mode',
                  },
                },
                {
                  name: 'radical_dark_background',
                  type: 'text',
                  defaultValue: 'hsl(0 0% 8%)',
                  admin: {
                    description: 'Very dark grey',
                  },
                },
                {
                  name: 'radical_dark_foreground',
                  type: 'text',
                  defaultValue: 'hsl(43 100% 95%)',
                  admin: {
                    description: 'Warm white',
                  },
                },
                {
                  name: 'radical_dark_card',
                  type: 'text',
                  defaultValue: 'hsl(0 0% 12%)',
                },
                {
                  name: 'radical_dark_card_foreground',
                  type: 'text',
                  defaultValue: 'hsl(43 100% 95%)',
                },
                {
                  name: 'radical_dark_muted',
                  type: 'text',
                  defaultValue: 'hsl(0 5% 15%)',
                },
                {
                  name: 'radical_dark_muted_foreground',
                  type: 'text',
                  defaultValue: 'hsl(43 20% 70%)',
                },
                {
                  name: 'radical_dark_accent',
                  type: 'text',
                  defaultValue: 'hsl(0 10% 20%)',
                },
                {
                  name: 'radical_dark_accent_foreground',
                  type: 'text',
                  defaultValue: 'hsl(43 100% 95%)',
                },
                {
                  name: 'radical_dark_destructive',
                  type: 'text',
                  defaultValue: 'hsl(0 90% 65%)',
                },
                {
                  name: 'radical_dark_border',
                  type: 'text',
                  defaultValue: 'hsl(0 5% 25%)',
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
