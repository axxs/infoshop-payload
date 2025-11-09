'use client'

import { Button } from '@payloadcms/ui'
import { useState } from 'react'
import { resetThemeToDefaults } from './actions/resetTheme'

/**
 * Reset Theme to Defaults Button
 *
 * Provides a button in the Theme admin UI to reset all color values
 * to their default values from Theme.ts
 */
export function ThemeResetButton() {
  const [isResetting, setIsResetting] = useState(false)

  const handleReset = async () => {
    if (
      !confirm(
        'Are you sure you want to reset the theme to default values? This will clear all customised dark mode colors.',
      )
    ) {
      return
    }

    setIsResetting(true)

    try {
      const result = await resetThemeToDefaults()

      if (!result.success) {
        throw new Error(result.error || 'Failed to reset theme')
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
