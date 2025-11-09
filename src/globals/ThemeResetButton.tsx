'use client'

import { Button, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useState } from 'react'

/**
 * Reset Theme to Defaults Button
 *
 * Provides a button in the Theme admin UI to reset all color values
 * to their default values from Theme.ts
 */
export function ThemeResetButton() {
  const [isResetting, setIsResetting] = useState(false)
  const { id } = useDocumentInfo()
  const activeTheme = useFormFields(([fields]) => fields.activeTheme?.value as string)

  const handleReset = async () => {
    if (
      !confirm(
        'Are you sure you want to reset the theme to default values? This will clear all customised colors.',
      )
    ) {
      return
    }

    setIsResetting(true)

    try {
      // Create the reset payload based on active theme
      const resetData: Record<string, undefined> = {
        // Reset both light and dark mode for both themes
        default_light_primary: undefined,
        default_light_background: undefined,
        default_light_foreground: undefined,
        default_light_card: undefined,
        default_light_card_foreground: undefined,
        default_light_popover: undefined,
        default_light_popover_foreground: undefined,
        default_light_secondary: undefined,
        default_light_secondary_foreground: undefined,
        default_light_muted: undefined,
        default_light_muted_foreground: undefined,
        default_light_accent: undefined,
        default_light_accent_foreground: undefined,
        default_light_destructive: undefined,
        default_light_destructive_foreground: undefined,
        default_light_border: undefined,
        default_light_input: undefined,
        default_light_ring: undefined,

        default_dark_primary: undefined,
        default_dark_background: undefined,
        default_dark_foreground: undefined,
        default_dark_card: undefined,
        default_dark_card_foreground: undefined,
        default_dark_popover: undefined,
        default_dark_popover_foreground: undefined,
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

        radical_light_primary: undefined,
        radical_light_background: undefined,
        radical_light_foreground: undefined,
        radical_light_card: undefined,
        radical_light_card_foreground: undefined,
        radical_light_popover: undefined,
        radical_light_popover_foreground: undefined,
        radical_light_secondary: undefined,
        radical_light_secondary_foreground: undefined,
        radical_light_muted: undefined,
        radical_light_muted_foreground: undefined,
        radical_light_accent: undefined,
        radical_light_accent_foreground: undefined,
        radical_light_destructive: undefined,
        radical_light_destructive_foreground: undefined,
        radical_light_border: undefined,
        radical_light_input: undefined,
        radical_light_ring: undefined,

        radical_dark_primary: undefined,
        radical_dark_background: undefined,
        radical_dark_foreground: undefined,
        radical_dark_card: undefined,
        radical_dark_card_foreground: undefined,
        radical_dark_popover: undefined,
        radical_dark_popover_foreground: undefined,
        radical_dark_secondary: undefined,
        radical_dark_secondary_foreground: undefined,
        radical_dark_muted: undefined,
        radical_dark_muted_foreground: undefined,
        radical_dark_accent: undefined,
        radical_dark_accent_foreground: undefined,
        radical_dark_destructive: undefined,
        radical_dark_destructive_foreground: undefined,
        radical_dark_border: undefined,
        radical_dark_input: undefined,
        radical_dark_ring: undefined,

        default_fontFamily: undefined,
        default_headingFontFamily: undefined,
        default_radius: undefined,

        radical_fontFamily: undefined,
        radical_headingFontFamily: undefined,
        radical_radius: undefined,
      }

      const response = await fetch('/api/globals/theme', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resetData),
      })

      if (!response.ok) {
        throw new Error('Failed to reset theme')
      }

      // Reload the page to show the reset values
      window.location.reload()
    } catch (error) {
      console.error('Error resetting theme:', error)
      alert('Failed to reset theme. Please try again.')
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div
      style={{
        marginBottom: '1rem',
        padding: '1rem',
        border: '1px solid var(--theme-elevation-400)',
        borderRadius: '4px',
      }}
    >
      <p style={{ marginBottom: '0.5rem', color: 'var(--theme-elevation-800)' }}>
        Reset all color values to their default values from the theme configuration.
      </p>
      <Button onClick={handleReset} disabled={isResetting} buttonStyle="secondary">
        {isResetting ? 'Resetting...' : 'Reset to Defaults'}
      </Button>
    </div>
  )
}
