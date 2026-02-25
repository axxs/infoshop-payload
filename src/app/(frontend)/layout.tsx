export const dynamic = 'force-dynamic'

import React from 'react'
import './globals.css'
import { HeaderDynamic } from './components/layout/HeaderDynamic'
import { FooterDynamic } from './components/layout/FooterDynamic'
import { ThemeProvider } from './components/ThemeProvider'
import { NoiseOverlay } from './components/cinematic/NoiseOverlay'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getThemeManifest, buildGoogleFontsUrl } from '@/lib/themes'

interface ThemeData {
  activeTheme: string
  colorMode: 'auto' | 'light' | 'dark'
  [key: string]: unknown
}

export const metadata = {
  description: 'Infoshop - Community bookstore collective',
  title: 'Infoshop Bookstore',
}

async function getTheme(): Promise<ThemeData> {
  const payload = await getPayload({ config })

  try {
    const theme = await payload.findGlobal({ slug: 'theme' })
    return theme as unknown as ThemeData
  } catch {
    return { activeTheme: 'organic-tech', colorMode: 'auto' }
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

  const activeTheme = theme.activeTheme || 'organic-tech'
  const colorMode = (theme.colorMode as 'auto' | 'light' | 'dark') || 'auto'
  const overrides = extractOverrides(theme)
  const manifest = getThemeManifest(activeTheme)
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
        <link rel="stylesheet" href={`/themes/${activeTheme}/overrides.css`} />
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
