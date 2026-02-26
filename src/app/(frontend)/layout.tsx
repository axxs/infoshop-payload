export const dynamic = 'force-dynamic'

import { cache } from 'react'
import React from 'react'
import './globals.css'
import { HeaderDynamic } from './components/layout/HeaderDynamic'
import { FooterDynamic } from './components/layout/FooterDynamic'
import { ThemeProvider } from './components/ThemeProvider'
import { NoiseOverlay } from './components/cinematic/NoiseOverlay'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getThemeManifest, getValidThemeSlugs, buildGoogleFontsUrl } from '@/lib/themes'

interface ThemeData {
  activeTheme: string
  colorMode: 'auto' | 'light' | 'dark'
  override_fontFamily?: string | null
  override_headingFontFamily?: string | null
  override_dramaFontFamily?: string | null
  override_radius?: string | null
  [key: `override_${'light' | 'dark'}_${string}`]: string | null | undefined
}

const THEME_DEFAULTS: ThemeData = { activeTheme: 'organic-tech', colorMode: 'auto' }

function parseThemeData(raw: Record<string, unknown>): ThemeData {
  const activeTheme = typeof raw.activeTheme === 'string' ? raw.activeTheme : 'organic-tech'
  const colorMode = raw.colorMode === 'light' || raw.colorMode === 'dark' ? raw.colorMode : 'auto'

  const overrides: Record<string, string | null> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith('override_') && (typeof value === 'string' || value === null)) {
      overrides[key] = value
    }
  }

  return { activeTheme, colorMode, ...overrides } as ThemeData
}

const getLayoutGlobal = cache(async () => {
  const payload = await getPayload({ config })
  try {
    return await payload.findGlobal({ slug: 'layout' })
  } catch {
    return null
  }
})

export async function generateMetadata(): Promise<import('next').Metadata> {
  const layout = await getLayoutGlobal()
  const siteName = (layout?.siteName as string) || 'Infoshop'
  const siteDescription =
    ((layout as unknown as Record<string, unknown>)?.siteDescription as string) ||
    'Community bookstore collective'

  return {
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description: siteDescription,
    openGraph: {
      siteName,
    },
  }
}

async function getTheme(): Promise<ThemeData> {
  const payload = await getPayload({ config })

  try {
    const theme = await payload.findGlobal({ slug: 'theme' })
    return parseThemeData({ ...theme })
  } catch {
    return THEME_DEFAULTS
  }
}

function extractOverrides(theme: ThemeData): Record<string, string | null | undefined> {
  const overrides: Record<string, string | null | undefined> = {}
  for (const [key, value] of Object.entries(theme)) {
    if (key.startsWith('override_')) {
      overrides[key] = typeof value === 'string' && value.trim() !== '' ? value : null
    }
  }
  return overrides
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props
  const theme = await getTheme()

  // Validate activeTheme against known theme slugs
  const validSlugs = await getValidThemeSlugs()
  const requestedTheme = theme.activeTheme || 'organic-tech'
  const activeTheme = validSlugs.includes(requestedTheme) ? requestedTheme : 'organic-tech'

  const colorMode = (theme.colorMode as 'auto' | 'light' | 'dark') || 'auto'
  const overrides = extractOverrides(theme)
  const manifest = await getThemeManifest(activeTheme)
  const googleFontsUrl = manifest ? buildGoogleFontsUrl(manifest) : null

  return (
    <html lang="en" data-theme={activeTheme}>
      <head>
        {googleFontsUrl && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="stylesheet" href={googleFontsUrl} />
          </>
        )}
        <link rel="stylesheet" href={`/themes/${activeTheme}/variables.css`} />
        {manifest?.hasOverrides && (
          <link rel="stylesheet" href={`/themes/${activeTheme}/overrides.css`} />
        )}
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <ThemeProvider activeTheme={activeTheme} colorMode={colorMode} overrides={overrides}>
          <NoiseOverlay />
          <div className="relative flex min-h-screen flex-col">
            <HeaderDynamic />
            <main className="flex-1">{children}</main>
            <FooterDynamic />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
