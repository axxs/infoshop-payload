'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { revalidatePath } from 'next/cache'

/**
 * Server action to reset theme to default values
 *
 * This deletes all saved theme values, forcing the application
 * to use the defaultValue from Theme.ts field definitions
 */
export async function resetThemeToDefaults() {
  try {
    const payload = await getPayload({ config })

    // Update global with null values to clear database entries
    // Payload will then use the defaultValue from field definitions
    await payload.updateGlobal({
      slug: 'theme',
      data: {
        activeTheme: 'default',
        colorMode: 'auto',
        // Reset all theme colors to null (will use defaults from Theme.ts)
        default_dark_background: null,
        default_dark_foreground: null,
        default_dark_card: null,
        default_dark_card_foreground: null,
        default_dark_popover: null,
        default_dark_popover_foreground: null,
        default_dark_primary: null,
        default_dark_secondary: null,
        default_dark_secondary_foreground: null,
        default_dark_muted: null,
        default_dark_muted_foreground: null,
        default_dark_accent: null,
        default_dark_accent_foreground: null,
        default_dark_destructive: null,
        default_dark_destructive_foreground: null,
        default_dark_border: null,
        default_dark_input: null,
        default_dark_ring: null,
      },
    })

    // Revalidate the theme page
    revalidatePath('/admin/globals/theme')

    return { success: true }
  } catch (error) {
    console.error('Failed to reset theme:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
