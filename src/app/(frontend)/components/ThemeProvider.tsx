'use client'

import { useEffect, useCallback } from 'react'

/** Lightweight check that a string looks like an HSL value: "H S% L%" (hue 0-360) */
function isValidHsl(value: string): boolean {
  return /^(?:360|(?:3[0-5]\d|[12]\d{2}|[1-9]?\d)(\.\d+)?)\s+\d{1,3}(\.\d+)?%\s+\d{1,3}(\.\d+)?%$/.test(
    value.trim(),
  )
}

interface ThemeOverrides {
  [key: string]: string | null | undefined
}

interface ThemeProviderProps {
  children: React.ReactNode
  activeTheme: string
  colorMode: 'auto' | 'light' | 'dark'
  overrides: ThemeOverrides
}

export function ThemeProvider({ children, activeTheme, colorMode, overrides }: ThemeProviderProps) {
  const applyOverrides = useCallback(
    (isDark: boolean) => {
      const root = document.documentElement
      const modePrefix = isDark ? 'dark' : 'light'

      // Clear all previously applied override properties before applying new ones
      for (const key of Object.keys(overrides)) {
        const lightMatch = key.match(/^override_light_(.+)$/)
        const darkMatch = key.match(/^override_dark_(.+)$/)
        if (lightMatch) {
          root.style.removeProperty(`--color-${lightMatch[1].replace(/_/g, '-')}`)
        } else if (darkMatch) {
          root.style.removeProperty(`--color-${darkMatch[1].replace(/_/g, '-')}`)
        }
      }

      // Apply overrides for the current mode
      for (const [key, value] of Object.entries(overrides)) {
        const lightMatch = key.match(/^override_light_(.+)$/)
        const darkMatch = key.match(/^override_dark_(.+)$/)

        if (lightMatch && modePrefix === 'light' && value && isValidHsl(value)) {
          const cssVar = `--color-${lightMatch[1].replace(/_/g, '-')}`
          root.style.setProperty(cssVar, `hsl(${value})`)
        } else if (darkMatch && modePrefix === 'dark' && value && isValidHsl(value)) {
          const cssVar = `--color-${darkMatch[1].replace(/_/g, '-')}`
          root.style.setProperty(cssVar, `hsl(${value})`)
        }
      }

      // Typography overrides (mode-independent)
      if (overrides.override_fontFamily) {
        root.style.setProperty('--font-family', overrides.override_fontFamily)
      } else {
        root.style.removeProperty('--font-family')
      }
      if (overrides.override_headingFontFamily) {
        root.style.setProperty('--font-heading', overrides.override_headingFontFamily)
      } else {
        root.style.removeProperty('--font-heading')
      }
      if (overrides.override_dramaFontFamily) {
        root.style.setProperty('--font-drama', overrides.override_dramaFontFamily)
      } else {
        root.style.removeProperty('--font-drama')
      }
      if (overrides.override_radius) {
        root.style.setProperty('--radius', overrides.override_radius)
      } else {
        root.style.removeProperty('--radius')
      }
    },
    [overrides],
  )

  // Apply theme and color mode
  useEffect(() => {
    const root = document.documentElement

    // Set data-theme attribute (activates theme CSS selectors)
    root.setAttribute('data-theme', activeTheme)

    // Determine dark mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const useDarkMode = colorMode === 'dark' || (colorMode === 'auto' && prefersDark)
    root.classList.toggle('dark', useDarkMode)

    applyOverrides(useDarkMode)
  }, [activeTheme, colorMode, applyOverrides])

  // Listen for system color scheme changes when in auto mode
  useEffect(() => {
    if (colorMode !== 'auto') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement
      root.classList.toggle('dark', e.matches)
      applyOverrides(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [colorMode, applyOverrides])

  return <>{children}</>
}
