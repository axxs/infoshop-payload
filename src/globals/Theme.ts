import type { GlobalConfig } from 'payload'
import { getThemeOptions } from '@/lib/themes'

/** Color tokens that can be overridden per mode */
export const COLOR_TOKENS = [
  { name: 'primary', label: 'Primary', description: 'Main buttons, links, and active elements' },
  {
    name: 'primary_foreground',
    label: 'Primary Foreground',
    description: 'Text and icons on primary-coloured elements',
  },
  {
    name: 'secondary',
    label: 'Secondary',
    description: 'Secondary buttons and highlighted sections',
  },
  {
    name: 'secondary_foreground',
    label: 'Secondary Foreground',
    description: 'Text and icons on secondary-coloured elements',
  },
  { name: 'background', label: 'Background', description: 'Main page background colour' },
  { name: 'foreground', label: 'Foreground', description: 'Main body text colour' },
  { name: 'card', label: 'Card', description: 'Card and panel background colour' },
  {
    name: 'card_foreground',
    label: 'Card Foreground',
    description: 'Text colour inside cards and panels',
  },
  { name: 'popover', label: 'Popover', description: 'Dropdown menu and tooltip background' },
  {
    name: 'popover_foreground',
    label: 'Popover Foreground',
    description: 'Text colour in dropdowns and tooltips',
  },
  {
    name: 'muted',
    label: 'Muted',
    description: 'Subtle background for secondary content areas',
  },
  {
    name: 'muted_foreground',
    label: 'Muted Foreground',
    description: 'De-emphasised text like captions and metadata',
  },
  { name: 'accent', label: 'Accent', description: 'Highlighted backgrounds and hover states' },
  {
    name: 'accent_foreground',
    label: 'Accent Foreground',
    description: 'Text on accent-coloured backgrounds',
  },
  {
    name: 'destructive',
    label: 'Destructive',
    description: 'Delete buttons, error messages, and warning states',
  },
  {
    name: 'destructive_foreground',
    label: 'Destructive Foreground',
    description: 'Text on destructive-coloured elements',
  },
  { name: 'border', label: 'Border', description: 'Borders, dividers, and separator lines' },
  { name: 'input', label: 'Input', description: 'Form input field borders' },
  { name: 'ring', label: 'Ring', description: 'Focus ring around interactive elements' },
]

function buildColorOverrideFields(mode: 'light' | 'dark') {
  return COLOR_TOKENS.map(({ name, label, description }) => ({
    name: `override_${mode}_${name}`,
    type: 'text' as const,
    label: `${label}`,
    admin: {
      description: `${description}. Leave blank to use theme default.`,
      placeholder: 'e.g. 150 27% 22%',
      components: {
        Field: '@/globals/components/ColorPickerField#ColorPickerField',
      },
    },
  }))
}

const themeOptions = getThemeOptions()

export const Theme: GlobalConfig = {
  slug: 'theme',
  access: {
    read: () => true,
    update: ({ req: { user } }) => !!user,
  },
  admin: {
    livePreview: {
      url: () => `${process.env.NEXT_PUBLIC_SERVER_URL}/`,
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
              defaultValue: 'organic-tech',
              admin: {
                description:
                  'Select the active theme. Themes are loaded from the themes/ directory.',
              },
              options:
                themeOptions.length > 0 ? themeOptions : [{ label: 'Default', value: 'default' }],
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
          label: 'Light Mode Overrides',
          description:
            'Override individual colour tokens for light mode. Leave blank to use the theme defaults.',
          fields: buildColorOverrideFields('light'),
        },
        {
          label: 'Dark Mode Overrides',
          description:
            'Override individual colour tokens for dark mode. Leave blank to use the theme defaults.',
          fields: buildColorOverrideFields('dark'),
        },
        {
          label: 'Typography Overrides',
          fields: [
            {
              name: 'override_fontFamily',
              type: 'text',
              admin: {
                description: 'Override body font family. Leave blank to use theme default.',
                placeholder: "e.g. 'Plus Jakarta Sans', system-ui, sans-serif",
              },
            },
            {
              name: 'override_headingFontFamily',
              type: 'text',
              admin: {
                description: 'Override heading font family. Leave blank to use theme default.',
                placeholder: "e.g. 'Outfit', system-ui, sans-serif",
              },
            },
            {
              name: 'override_dramaFontFamily',
              type: 'text',
              admin: {
                description:
                  'Override drama/display font family. Leave blank to use theme default.',
                placeholder: "e.g. 'Cormorant Garamond', Georgia, serif",
              },
            },
            {
              name: 'override_radius',
              type: 'text',
              admin: {
                description: 'Override border radius. Leave blank to use theme default.',
                placeholder: 'e.g. 2rem',
              },
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
      ],
    },
  ],
}
