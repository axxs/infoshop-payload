'use client'

import { Button } from '@payloadcms/ui'
import { useState } from 'react'
import { resetThemeToDefaults } from './actions/resetTheme'

export function ThemeResetButton() {
  const [isResetting, setIsResetting] = useState(false)

  const handleReset = async () => {
    if (
      !confirm(
        'Are you sure you want to reset all overrides? This will clear any custom colour and typography overrides, reverting to the active theme defaults.',
      )
    ) {
      return
    }

    setIsResetting(true)

    try {
      const result = await resetThemeToDefaults()

      if (!result.success) {
        throw new Error(result.error || 'Failed to reset overrides')
      }

      window.location.reload()
    } catch (error) {
      console.error('Error resetting theme overrides:', error)
      alert('Failed to reset overrides. Please try again.')
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
        Clear all colour and typography overrides, reverting to the active theme defaults.
      </p>
      <Button onClick={handleReset} disabled={isResetting} buttonStyle="secondary">
        {isResetting ? 'Resetting...' : 'Reset All Overrides'}
      </Button>
    </div>
  )
}
