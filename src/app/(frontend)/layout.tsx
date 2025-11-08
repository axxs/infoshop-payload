import React from 'react'
import './globals.css'
import { HeaderDynamic } from './components/layout/HeaderDynamic'
import { FooterDynamic } from './components/layout/FooterDynamic'
import { ThemeProvider } from './components/ThemeProvider'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Theme } from '@/payload-types'

export const metadata = {
  description: 'Infoshop - Community bookstore collective',
  title: 'Infoshop Bookstore',
}

async function getTheme(): Promise<Theme> {
  const payload = await getPayload({ config })

  try {
    const theme = await payload.findGlobal({
      slug: 'theme',
    })
    return theme as Theme
  } catch (_error) {
    // Return default theme if not configured yet
    return {
      id: 0,
      activeTheme: 'default',
      colorMode: 'auto',
    } as Theme
  }
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props
  const theme = await getTheme()

  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider initialTheme={theme}>
          <div className="flex min-h-screen flex-col">
            <HeaderDynamic />
            <main className="flex-1">{children}</main>
            <FooterDynamic />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
