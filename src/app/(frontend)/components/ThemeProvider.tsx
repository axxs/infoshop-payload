'use client'

import { useEffect, useState } from 'react'

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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Apply theme and color mode
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement

    // Set data-theme attribute (activates theme CSS selectors)
    root.setAttribute('data-theme', activeTheme)

    // Determine dark mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const useDarkMode = colorMode === 'dark' || (colorMode === 'auto' && prefersDark)
    root.classList.toggle('dark', useDarkMode)

    // Apply admin overrides as inline style (specificity wins over theme CSS)
    const modePrefix = useDarkMode ? 'dark' : 'light'

    for (const [key, value] of Object.entries(overrides)) {
      // Only process keys for the current mode
      const lightMatch = key.match(/^override_light_(.+)$/)
      const darkMatch = key.match(/^override_dark_(.+)$/)

      if (lightMatch && modePrefix === 'light' && value) {
        const cssVar = `--color-${lightMatch[1].replace(/_/g, '-')}`
        root.style.setProperty(cssVar, `hsl(${value})`)
      } else if (darkMatch && modePrefix === 'dark' && value) {
        const cssVar = `--color-${darkMatch[1].replace(/_/g, '-')}`
        root.style.setProperty(cssVar, `hsl(${value})`)
      } else if (lightMatch && modePrefix === 'light' && !value) {
        const cssVar = `--color-${lightMatch[1].replace(/_/g, '-')}`
        root.style.removeProperty(cssVar)
      } else if (darkMatch && modePrefix === 'dark' && !value) {
        const cssVar = `--color-${darkMatch[1].replace(/_/g, '-')}`
        root.style.removeProperty(cssVar)
      }
    }

    // Typography overrides
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
  }, [activeTheme, colorMode, overrides, mounted])

  // Listen for system color scheme changes when in auto mode
  useEffect(() => {
    if (!mounted || colorMode !== 'auto') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement
      root.classList.toggle('dark', e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [colorMode, mounted])

  if (!mounted) return null

  return <>{children}</>
}
