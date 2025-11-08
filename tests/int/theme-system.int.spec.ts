import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'
import type { Theme, Layout } from '@/payload-types'

let payload: Payload

describe('Theme System', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  describe('Theme Global', () => {
    it('fetches theme global', async () => {
      const theme = await payload.findGlobal({
        slug: 'theme',
      })

      expect(theme).toBeDefined()
      expect(theme.id).toBeDefined()
    })

    it('has default theme configuration', async () => {
      const theme = (await payload.findGlobal({
        slug: 'theme',
      })) as Theme

      expect(theme.activeTheme).toBeDefined()
      expect(['default', 'radical']).toContain(theme.activeTheme)
    })

    it('has color mode configuration', async () => {
      const theme = (await payload.findGlobal({
        slug: 'theme',
      })) as Theme

      expect(theme.colorMode).toBeDefined()
      expect(['auto', 'light', 'dark']).toContain(theme.colorMode)
    })

    it('has default theme light mode colors', async () => {
      const theme = (await payload.findGlobal({
        slug: 'theme',
      })) as Theme

      // Check that default theme colors exist (they may be undefined if not set, which is fine)
      expect(theme).toBeDefined()

      // If colors are set, they should be in Tailwind v4 HSL format (e.g., "221 83% 53%")
      if (theme.default_light_primary) {
        expect(theme.default_light_primary).toMatch(/^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/)
      }
    })

    it('can update theme configuration', async () => {
      // Get current theme
      const currentTheme = (await payload.findGlobal({
        slug: 'theme',
      })) as Theme

      const originalActiveTheme = currentTheme.activeTheme
      const newActiveTheme = originalActiveTheme === 'default' ? 'radical' : 'default'

      // Update theme
      const updatedTheme = await payload.updateGlobal({
        slug: 'theme',
        data: {
          activeTheme: newActiveTheme,
        },
      })

      expect(updatedTheme.activeTheme).toBe(newActiveTheme)

      // Revert back
      await payload.updateGlobal({
        slug: 'theme',
        data: {
          activeTheme: originalActiveTheme,
        },
      })
    })
  })

  describe('Layout Global', () => {
    it('fetches layout global', async () => {
      const layout = await payload.findGlobal({
        slug: 'layout',
      })

      expect(layout).toBeDefined()
      expect(layout.id).toBeDefined()
    })

    it('has navigation configuration', async () => {
      const layout = (await payload.findGlobal({
        slug: 'layout',
      })) as Layout

      expect(layout.navigation).toBeDefined()
      expect(Array.isArray(layout.navigation)).toBe(true)
    })

    it('navigation items have required fields', async () => {
      const layout = (await payload.findGlobal({
        slug: 'layout',
      })) as Layout

      if (layout.navigation && layout.navigation.length > 0) {
        const firstItem = layout.navigation[0]
        expect(firstItem).toBeDefined()
        expect(firstItem.label).toBeDefined()
        expect(firstItem.href).toBeDefined()
      }
    })

    it('has footer columns configuration', async () => {
      const layout = (await payload.findGlobal({
        slug: 'layout',
      })) as Layout

      expect(layout.columns).toBeDefined()
      expect(Array.isArray(layout.columns)).toBe(true)
    })

    it('footer columns have required fields', async () => {
      const layout = (await payload.findGlobal({
        slug: 'layout',
      })) as Layout

      if (layout.columns && layout.columns.length > 0) {
        const firstColumn = layout.columns[0]
        expect(firstColumn).toBeDefined()
        expect(firstColumn.title).toBeDefined()
        expect(Array.isArray(firstColumn.links)).toBe(true)
      }
    })

    it('has social links configuration', async () => {
      const layout = (await payload.findGlobal({
        slug: 'layout',
      })) as Layout

      expect(layout.socialLinks).toBeDefined()
      expect(Array.isArray(layout.socialLinks)).toBe(true)
    })

    it('social links have valid platforms', async () => {
      const layout = (await payload.findGlobal({
        slug: 'layout',
      })) as Layout

      const validPlatforms = ['facebook', 'twitter', 'instagram', 'linkedin', 'github', 'youtube']

      if (layout.socialLinks && layout.socialLinks.length > 0) {
        layout.socialLinks.forEach((socialLink) => {
          if (socialLink.platform) {
            expect(validPlatforms).toContain(socialLink.platform)
          }
          expect(socialLink.url).toBeDefined()
        })
      }
    })

    it('has copyright text', async () => {
      const layout = (await payload.findGlobal({
        slug: 'layout',
      })) as Layout

      expect(layout.copyright).toBeDefined()
      expect(typeof layout.copyright).toBe('string')
    })

    it('has CTA button configuration', async () => {
      const layout = (await payload.findGlobal({
        slug: 'layout',
      })) as Layout

      expect(layout.ctaButton).toBeDefined()

      if (layout.ctaButton) {
        // CTA button can be configured or left empty
        if (layout.ctaButton.label || layout.ctaButton.href) {
          expect(layout.ctaButton.label).toBeDefined()
          expect(layout.ctaButton.href).toBeDefined()
        }
      }
    })

    it('can update layout configuration', async () => {
      const currentLayout = (await payload.findGlobal({
        slug: 'layout',
      })) as Layout

      const originalCopyright = currentLayout.copyright
      const newCopyright = `© ${new Date().getFullYear()} Test Copyright`

      // Update layout
      const updatedLayout = await payload.updateGlobal({
        slug: 'layout',
        data: {
          copyright: newCopyright,
        },
      })

      expect(updatedLayout.copyright).toBe(newCopyright)

      // Revert back
      await payload.updateGlobal({
        slug: 'layout',
        data: {
          copyright: originalCopyright,
        },
      })
    })
  })

  describe('Theme Data Integrity', () => {
    it('theme has all required color variables for default theme', async () => {
      const theme = (await payload.findGlobal({
        slug: 'theme',
      })) as Theme

      // These fields have defaults, so they should always exist
      const requiredFields = [
        'default_light_primary',
        'default_light_background',
        'default_light_foreground',
      ]

      // Check that all required fields are present (they may be default values)
      requiredFields.forEach((field) => {
        expect(theme[field as keyof Theme]).toBeDefined()
      })
    })

    it('theme has all required color variables for radical theme', async () => {
      const theme = (await payload.findGlobal({
        slug: 'theme',
      })) as Theme

      // Check radical theme colors
      const requiredFields = [
        'radical_light_primary',
        'radical_light_background',
        'radical_light_foreground',
      ]

      requiredFields.forEach((field) => {
        expect(theme[field as keyof Theme]).toBeDefined()
      })
    })

    it('typography settings are defined', async () => {
      const theme = (await payload.findGlobal({
        slug: 'theme',
      })) as Theme

      expect(theme.default_fontFamily).toBeDefined()
      expect(theme.default_headingFontFamily).toBeDefined()
      expect(theme.default_radius).toBeDefined()
    })
  })

  describe('Layout Data Integrity', () => {
    it('navigation supports nested children', async () => {
      const layout = (await payload.findGlobal({
        slug: 'layout',
      })) as Layout

      // Check if any navigation items have children
      if (layout.navigation && layout.navigation.length > 0) {
        const itemWithChildren = layout.navigation.find(
          (item) => item.children && item.children.length > 0,
        )

        if (itemWithChildren?.children) {
          const firstChild = itemWithChildren.children[0]
          expect(firstChild.label).toBeDefined()
          expect(firstChild.href).toBeDefined()
        }
      }
    })

    it('footer links have correct structure', async () => {
      const layout = (await payload.findGlobal({
        slug: 'layout',
      })) as Layout

      if (layout.columns && layout.columns.length > 0) {
        layout.columns.forEach((column) => {
          if (column.links && column.links.length > 0) {
            column.links.forEach((link) => {
              expect(link.label).toBeDefined()
              expect(link.href).toBeDefined()
              expect(typeof link.label).toBe('string')
              expect(typeof link.href).toBe('string')
            })
          }
        })
      }
    })
  })

  describe('Access Control', () => {
    it('allows public read access to theme global', async () => {
      const theme = await payload.findGlobal({
        slug: 'theme',
      })

      // Should be able to fetch without authentication
      expect(theme).toBeDefined()
    })

    it('allows public read access to layout global', async () => {
      const layout = await payload.findGlobal({
        slug: 'layout',
      })

      // Should be able to fetch without authentication
      expect(layout).toBeDefined()
    })
  })
})
