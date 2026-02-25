import type { GlobalConfig } from 'payload'
import { getThemeOptions } from '@/lib/themes'

/** Color tokens that can be overridden per mode */
const COLOR_TOKENS = [
  { name: 'primary', label: 'Primary' },
  { name: 'primary_foreground', label: 'Primary Foreground' },
  { name: 'secondary', label: 'Secondary' },
  { name: 'secondary_foreground', label: 'Secondary Foreground' },
  { name: 'background', label: 'Background' },
  { name: 'foreground', label: 'Foreground' },
  { name: 'card', label: 'Card' },
  { name: 'card_foreground', label: 'Card Foreground' },
  { name: 'popover', label: 'Popover' },
  { name: 'popover_foreground', label: 'Popover Foreground' },
  { name: 'muted', label: 'Muted' },
  { name: 'muted_foreground', label: 'Muted Foreground' },
  { name: 'accent', label: 'Accent' },
  { name: 'accent_foreground', label: 'Accent Foreground' },
  { name: 'destructive', label: 'Destructive' },
  { name: 'destructive_foreground', label: 'Destructive Foreground' },
  { name: 'border', label: 'Border' },
  { name: 'input', label: 'Input' },
  { name: 'ring', label: 'Ring' },
]

function buildColorOverrideFields(mode: 'light' | 'dark') {
  return COLOR_TOKENS.map(({ name, label }) => ({
    name: `override_${mode}_${name}`,
    type: 'text' as const,
    label: `${label}`,
    admin: {
      description: `Override ${label} colour for ${mode} mode (HSL, e.g. "150 27% 22%"). Leave blank to use theme default.`,
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
