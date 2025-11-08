'use client'

import { useEffect, useState } from 'react'
import type { Theme } from '@/payload-types'

interface ThemeProviderProps {
  children: React.ReactNode
  initialTheme: Theme
}

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const [theme] = useState<Theme>(initialTheme)
  const [mounted, setMounted] = useState(false)
  const [, forceUpdate] = useState(0)

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  // Apply theme CSS variables
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    const activeTheme = theme.activeTheme
    const colorMode = theme.colorMode

    // Determine if we should use dark mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const useDarkMode = colorMode === 'dark' || (colorMode === 'auto' && prefersDark)

    // Apply theme class
    root.setAttribute('data-theme', activeTheme)
    root.classList.toggle('dark', useDarkMode)

    // Build theme prefix for accessing color tokens
    const modePrefix = useDarkMode ? 'dark' : 'light'
    const themePrefix = `${activeTheme}_${modePrefix}`

    // Apply CSS variables based on active theme and mode
    const cssVars: Record<string, string> = {}

    // Color tokens
    const colorKeys = [
      'primary',
      'background',
      'foreground',
      'card',
      'cardForeground',
      'popover',
      'popoverForeground',
      'secondary',
      'secondaryForeground',
      'muted',
      'mutedForeground',
      'accent',
      'accentForeground',
      'destructive',
      'destructiveForeground',
      'border',
      'input',
      'ring',
    ]

    colorKeys.forEach((key) => {
      const themeKey = `${themePrefix}_${key}` as keyof Theme
      const value = theme[themeKey]
      if (value && typeof value === 'string') {
        // Use --color-* prefix for Tailwind v4 compatibility
        const cssVarName =
          key === 'ring' || key === 'border' || key === 'input'
            ? `--color-${key}`
            : `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
        // Wrap in hsl() for Tailwind v4
        cssVars[cssVarName] = `hsl(${value})`
      }
    })

    // Typography (theme-specific)
    const fontFamilyKey = `${activeTheme}_fontFamily` as keyof Theme
    const headingFontFamilyKey = `${activeTheme}_headingFontFamily` as keyof Theme
    const radiusKey = `${activeTheme}_radius` as keyof Theme

    const fontFamily = theme[fontFamilyKey]
    const headingFontFamily = theme[headingFontFamilyKey]
    const radius = theme[radiusKey]

    if (fontFamily && typeof fontFamily === 'string') {
      cssVars['--font-family'] = fontFamily
    }
    if (headingFontFamily && typeof headingFontFamily === 'string') {
      cssVars['--font-heading'] = headingFontFamily
    }
    if (radius && typeof radius === 'string') {
      cssVars['--radius'] = radius
    }

    // Apply all CSS variables to root
    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
  }, [theme, mounted])

  // Listen for system color scheme changes
  useEffect(() => {
    if (!mounted || theme.colorMode !== 'auto') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      // Trigger re-render by incrementing counter (more efficient than object spreading)
      forceUpdate((n) => n + 1)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme.colorMode, mounted])

  // Prevent flash of unstyled content
  if (!mounted) {
    return null
  }

  return <>{children}</>
}
