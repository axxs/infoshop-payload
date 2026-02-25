import fs from 'node:fs'
import path from 'node:path'

export interface ThemeFont {
  family: string
  google: string | null
}

export interface ThemeManifest {
  name: string
  slug: string
  version: string
  author: string
  description: string
  fonts: {
    body: ThemeFont
    heading: ThemeFont
    drama: ThemeFont
    mono: ThemeFont
  }
  supports: string[]
}

/** Cached theme manifests — populated once at module load */
let cachedThemes: ThemeManifest[] | null = null

function getThemesDir(): string {
  return path.resolve(process.cwd(), 'themes')
}

/**
 * Discover all themes from the themes/ directory.
 * Synchronous filesystem scan, cached after first call.
 */
export function discoverThemes(): ThemeManifest[] {
  if (cachedThemes) return cachedThemes

  const themesDir = getThemesDir()

  if (!fs.existsSync(themesDir)) {
    cachedThemes = []
    return cachedThemes
  }

  const entries = fs.readdirSync(themesDir, { withFileTypes: true })
  const themes: ThemeManifest[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const manifestPath = path.join(themesDir, entry.name, 'manifest.json')
    if (!fs.existsSync(manifestPath)) continue

    const raw = fs.readFileSync(manifestPath, 'utf-8')
    const manifest: ThemeManifest = JSON.parse(raw)
    themes.push(manifest)
  }

  cachedThemes = themes
  return cachedThemes
}

/**
 * Get a specific theme manifest by slug.
 */
export function getThemeManifest(slug: string): ThemeManifest | undefined {
  return discoverThemes().find((t) => t.slug === slug)
}

/**
 * Get theme options for Payload select field: {label, value}[]
 */
export function getThemeOptions(): Array<{ label: string; value: string }> {
  return discoverThemes().map((t) => ({
    label: t.name,
    value: t.slug,
  }))
}

/**
 * Build a Google Fonts URL from a theme manifest.
 * Returns null if the theme uses no Google Fonts.
 */
export function buildGoogleFontsUrl(manifest: ThemeManifest): string | null {
  const families: string[] = []

  for (const font of Object.values(manifest.fonts)) {
    if (font.google) {
      families.push(font.google)
    }
  }

  if (families.length === 0) return null

  return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`
}
