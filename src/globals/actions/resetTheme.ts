'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { revalidatePath } from 'next/cache'
import { COLOR_TOKENS } from '@/globals/Theme'

export async function resetThemeToDefaults() {
  try {
    const payload = await getPayload({ config })

    // Build null values for all override fields
    const resetData: Record<string, null> = {}

    for (const mode of ['light', 'dark'] as const) {
      for (const { name } of COLOR_TOKENS) {
        resetData[`override_${mode}_${name}`] = null
      }
    }

    // Typography overrides
    resetData.override_fontFamily = null
    resetData.override_headingFontFamily = null
    resetData.override_dramaFontFamily = null
    resetData.override_radius = null

    await payload.updateGlobal({
      slug: 'theme',
      data: resetData,
    })

    revalidatePath('/admin/globals/theme')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
