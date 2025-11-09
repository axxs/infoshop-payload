/**
 * Reset Theme to Defaults
 *
 * This script deletes the theme document from the database,
 * forcing the application to use the default values from Theme.ts
 *
 * Usage: NODE_OPTIONS='--require dotenv/config' pnpm tsx scripts/reset-theme.ts
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'

async function resetTheme() {
  console.log('🔄 Resetting theme to defaults...\n')

  try {
    const payload = await getPayload({ config })

    // Find the theme global
    const theme = await payload.findGlobal({
      slug: 'theme',
    })

    if (!theme) {
      console.log('✓ No theme document found - defaults will be used')
      process.exit(0)
    }

    console.log('Current theme settings:')
    console.log('  Active Theme:', theme.activeTheme)
    console.log('  Color Mode:', theme.colorMode)
    console.log('')

    // Delete all theme field values by updating to undefined
    // This forces Payload to use the defaultValue from Theme.ts
    await payload.updateGlobal({
      slug: 'theme',
      data: {
        activeTheme: 'default',
        colorMode: 'auto',
        // Reset all default theme dark mode colors to undefined
        // This will make them use the new defaultValues from Theme.ts
        default_dark_background: undefined,
        default_dark_foreground: undefined,
        default_dark_card: undefined,
        default_dark_card_foreground: undefined,
        default_dark_popover: undefined,
        default_dark_popover_foreground: undefined,
        default_dark_primary: undefined,
        default_dark_primary_foreground: undefined,
        default_dark_secondary: undefined,
        default_dark_secondary_foreground: undefined,
        default_dark_muted: undefined,
        default_dark_muted_foreground: undefined,
        default_dark_accent: undefined,
        default_dark_accent_foreground: undefined,
        default_dark_destructive: undefined,
        default_dark_destructive_foreground: undefined,
        default_dark_border: undefined,
        default_dark_input: undefined,
        default_dark_ring: undefined,
      },
    })

    console.log('✓ Theme reset to defaults successfully!')
    console.log('\nThe application will now use the improved dark mode colors.')
    console.log('Refresh your browser to see the changes.')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error resetting theme:', error)
    process.exit(1)
  }
}

resetTheme()
