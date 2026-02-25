import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
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
  hasOverrides: boolean
}

/**
 * Cached theme manifests — populated once per Node.js process lifetime.
 * In serverless/edge runtimes, this cache persists across warm invocations but
 * the filesystem may have changed. Adding or removing themes at runtime requires
 * a cold start or an explicit call to `clearThemeCache()`.
 */
let cachedThemes: ThemeManifest[] | null = null

/** Clear the in-memory theme cache, forcing re-discovery on next access. */
export function clearThemeCache(): void {
  cachedThemes = null
}

function getThemesDir(): string {
  return path.resolve(process.cwd(), 'themes')
}

/**
 * Discover all themes from the themes/ directory (synchronous).
 * Used at config load time where async is not supported.
 */
export function discoverThemesSync(): ThemeManifest[] {
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

    try {
      const raw = fs.readFileSync(manifestPath, 'utf-8')
      const manifest = JSON.parse(raw) as Omit<ThemeManifest, 'hasOverrides'>
      const overridesPath = path.join(themesDir, entry.name, 'overrides.css')
      themes.push({
        ...manifest,
        hasOverrides: fs.existsSync(overridesPath),
      })
    } catch {
      // Skip themes with invalid or unreadable manifests
    }
  }

  cachedThemes = themes
  return cachedThemes
}

/**
 * Discover all themes from the themes/ directory (async).
 * Used at request time in layout.tsx and other async contexts.
 */
export async function discoverThemes(): Promise<ThemeManifest[]> {
  if (cachedThemes) return cachedThemes

  const themesDir = getThemesDir()

  try {
    await fsPromises.access(themesDir)
  } catch {
    cachedThemes = []
    return cachedThemes
  }

  const entries = await fsPromises.readdir(themesDir, { withFileTypes: true })
  const themes: ThemeManifest[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const manifestPath = path.join(themesDir, entry.name, 'manifest.json')

    try {
      const raw = await fsPromises.readFile(manifestPath, 'utf-8')
      const manifest = JSON.parse(raw) as Omit<ThemeManifest, 'hasOverrides'>
      let hasOverrides = false
      try {
        await fsPromises.access(path.join(themesDir, entry.name, 'overrides.css'))
        hasOverrides = true
      } catch {
        // No overrides.css for this theme
      }
      themes.push({ ...manifest, hasOverrides })
    } catch {
      // Skip themes with invalid or unreadable manifests
    }
  }

  cachedThemes = themes
  return cachedThemes
}

/**
 * Get a specific theme manifest by slug (async).
 */
export async function getThemeManifest(slug: string): Promise<ThemeManifest | undefined> {
  const themes = await discoverThemes()
  return themes.find((t) => t.slug === slug)
}

/**
 * Get theme options for Payload select field: {label, value}[]
 * Synchronous — used at config load time.
 */
export function getThemeOptions(): Array<{ label: string; value: string }> {
  return discoverThemesSync().map((t) => ({
    label: t.name,
    value: t.slug,
  }))
}

/**
 * Get all known theme slugs (async). Used for validating activeTheme values.
 */
export async function getValidThemeSlugs(): Promise<string[]> {
  const themes = await discoverThemes()
  return themes.map((t) => t.slug)
}

/**
 * Build a Google Fonts URL from a theme manifest.
 * Returns null if the theme uses no Google Fonts.
 *
 * Note: `font.google` values must be pre-encoded for URL use
 * (spaces as `+`, e.g. "Plus+Jakarta+Sans:wght@300;400").
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
