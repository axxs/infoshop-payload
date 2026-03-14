import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the dependencies before importing the module under test
vi.mock('../../../src/lib/isbnUtils', () => ({
  cleanISBN: (isbn: string) => isbn.replace(/[-\s]/g, ''),
  convertISBN10to13: (isbn10: string) => {
    if (isbn10 === '0140410341') return '9780140410341'
    if (isbn10 === 'BADISBN10X') return null
    return `978${isbn10.slice(0, 9)}0` // simplified
  },
}))

vi.mock('../../../src/lib/openLibrary/imageDownloader', () => ({
  MIN_COVER_SIZE: 15_000,
  isPlaceholderUrl: (url: string) =>
    /\/nophoto\/|placeholder|no[-_]?cover|image[-_]?not[-_]?available/i.test(url),
}))

vi.mock('../../../src/lib/urlValidator', () => ({
  validateImageURL: (url: string) => {
    try {
      const parsed = new URL(url)
      if (parsed.hostname === '169.254.169.254') return null
      if (parsed.hostname === 'localhost') return null
      if (parsed.protocol !== 'https:') return null
      return url
    } catch {
      return null
    }
  },
}))

// Import after mocks
import { resolveCoverUrl } from '../../../src/lib/bookLookup/coverResolver'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

/** Creates a mock Response with the given properties */
function mockImageResponse(options: {
  ok?: boolean
  status?: number
  contentType?: string
  contentRange?: string | null
  contentLength?: string | null
  url?: string
  bodySize?: number
}) {
  const {
    ok = true,
    status = 200,
    contentType = 'image/jpeg',
    contentRange = null,
    contentLength = null,
    url = 'https://example.com/image.jpg',
    bodySize = 20_000,
  } = options

  const headers = new Map<string, string>()
  if (contentType) headers.set('content-type', contentType)
  if (contentRange) headers.set('content-range', contentRange)
  if (contentLength) headers.set('content-length', contentLength)

  // Create a readable stream that yields `bodySize` bytes
  const chunks = [new Uint8Array(bodySize)]
  let chunkIndex = 0

  return {
    ok,
    status,
    url,
    headers: { get: (key: string) => headers.get(key) ?? null },
    body: {
      getReader: () => ({
        read: () => {
          if (chunkIndex < chunks.length) {
            const value = chunks[chunkIndex++]
            return Promise.resolve({ done: false, value })
          }
          return Promise.resolve({ done: true, value: undefined })
        },
        cancel: () => Promise.resolve(),
      }),
      cancel: () => Promise.resolve(),
    },
  }
}

describe('coverResolver', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('resolveCoverUrl', () => {
    it('returns null for invalid ISBN length', async () => {
      const result = await resolveCoverUrl({ isbn: '123' })
      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('returns existingUrl when it passes probe', async () => {
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({ contentLength: '50000' }),
      )

      const result = await resolveCoverUrl({
        isbn: '9780140410341',
        existingUrl: 'https://example.com/cover.jpg',
      })

      expect(result).toBe('https://example.com/cover.jpg')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('skips placeholder URLs without fetching', async () => {
      // existingUrl is a placeholder — should be skipped
      // Next candidate (OL CDN) should be tried
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({
          url: 'https://covers.openlibrary.org/b/isbn/9780140410341-L.jpg',
          contentLength: '50000',
        }),
      )

      const result = await resolveCoverUrl({
        isbn: '9780140410341',
        existingUrl: 'https://example.com/nophoto/default.jpg',
      })

      expect(result).toBe('https://covers.openlibrary.org/b/isbn/9780140410341-L.jpg')
    })

    it('falls back through candidates when earlier ones fail', async () => {
      // existingUrl fails (non-image)
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({ contentType: 'text/html' }),
      )
      // OL CDN ISBN-13 fails (too small)
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({ contentLength: '500' }),
      )
      // No ISBN-10 candidate (input is ISBN-13)
      // Longitood returns a valid cover
      mockFetch.mockResolvedValueOnce({
        ok: true,
        url: 'https://bookcover.longitood.com/bookcover?isbn=9780140410341',
        headers: { get: () => null },
        json: () =>
          Promise.resolve({ url: 'https://cdn.example.com/real-cover.jpg' }),
        body: { cancel: () => Promise.resolve() },
      })
      // Probe of longitood's returned URL succeeds
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({
          url: 'https://cdn.example.com/real-cover.jpg',
          contentLength: '80000',
        }),
      )

      const result = await resolveCoverUrl({
        isbn: '9780140410341',
        existingUrl: 'https://example.com/page.html',
      })

      expect(result).toBe('https://cdn.example.com/real-cover.jpg')
    })

    it('returns null when all candidates fail', async () => {
      // All probes return too-small images
      mockFetch.mockResolvedValue(
        mockImageResponse({ contentLength: '100' }),
      )

      const result = await resolveCoverUrl({
        isbn: '9780140410341',
        existingUrl: 'https://example.com/small.jpg',
      })

      expect(result).toBeNull()
    })

    it('handles ISBN-10 input correctly', async () => {
      // existingUrl not provided, first candidate is OL CDN ISBN-13
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({ contentLength: '100' }), // too small
      )
      // Second candidate is OL CDN ISBN-10
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({
          url: 'https://covers.openlibrary.org/b/isbn/0140410341-L.jpg',
          contentLength: '50000',
        }),
      )

      const result = await resolveCoverUrl({ isbn: '0140410341' })

      expect(result).toBe('https://covers.openlibrary.org/b/isbn/0140410341-L.jpg')
      // Should have probed isbn13 first, then isbn10
      const urls = mockFetch.mock.calls.map((call) => call[0])
      expect(urls[0]).toContain('9780140410341')
      expect(urls[1]).toContain('0140410341')
    })

    it('skips ISBN-13 candidate when conversion fails', async () => {
      // ISBN-10 that can't be converted
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({
          url: 'https://covers.openlibrary.org/b/isbn/BADISBN10X-L.jpg',
          contentLength: '50000',
        }),
      )

      const result = await resolveCoverUrl({ isbn: 'BADISBN10X' })

      // Should only probe ISBN-10, not ISBN-13 (conversion failed)
      const urls = mockFetch.mock.calls.map((call) => call[0])
      expect(urls[0]).toContain('BADISBN10X')
      expect(urls).toHaveLength(1)
      expect(result).toBe('https://covers.openlibrary.org/b/isbn/BADISBN10X-L.jpg')
    })

    it('adds Google Books fife variant for GB URLs', async () => {
      // existingUrl (GB) fails
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({ contentLength: '100' }),
      )
      // fife variant succeeds
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({
          url: 'https://books.google.com/content?id=abc&fife=w800',
          contentLength: '50000',
        }),
      )

      const result = await resolveCoverUrl({
        isbn: '9780140410341',
        existingUrl: 'https://books.google.com/content?id=abc&fife=w200',
      })

      expect(result).toContain('fife=w800')
    })
  })

  describe('probeImageUrl (via resolveCoverUrl)', () => {
    it('rejects non-HTTPS URLs', async () => {
      const result = await resolveCoverUrl({
        isbn: '9780140410341',
        existingUrl: 'http://example.com/cover.jpg',
      })

      // Should skip the http URL and try OL CDN
      const firstFetchUrl = mockFetch.mock.calls[0]?.[0]
      expect(firstFetchUrl).toContain('covers.openlibrary.org')
    })

    it('uses Content-Range for size check on 206', async () => {
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({
          status: 206,
          contentRange: 'bytes 0-14999/80000',
        }),
      )

      const result = await resolveCoverUrl({
        isbn: '9780140410341',
        existingUrl: 'https://example.com/cover.jpg',
      })

      expect(result).toBe('https://example.com/cover.jpg')
    })

    it('rejects when Content-Range shows file too small', async () => {
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({
          status: 206,
          contentRange: 'bytes 0-499/500',
        }),
      )
      // Falls through to OL CDN
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({ contentLength: '50000' }),
      )

      const result = await resolveCoverUrl({
        isbn: '9780140410341',
        existingUrl: 'https://example.com/tiny.jpg',
      })

      expect(result).not.toBe('https://example.com/tiny.jpg')
    })

    it('uses Content-Length for size check when no Content-Range', async () => {
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({ contentLength: '50000' }),
      )

      const result = await resolveCoverUrl({
        isbn: '9780140410341',
        existingUrl: 'https://example.com/cover.jpg',
      })

      expect(result).toBe('https://example.com/cover.jpg')
    })

    it('falls back to streaming body read when no headers', async () => {
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({ bodySize: 20_000 }),
      )

      const result = await resolveCoverUrl({
        isbn: '9780140410341',
        existingUrl: 'https://example.com/cover.jpg',
      })

      expect(result).toBe('https://example.com/cover.jpg')
    })

    it('rejects when streaming body is too small', async () => {
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({ bodySize: 500 }),
      )
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({ contentLength: '50000' }),
      )

      const result = await resolveCoverUrl({
        isbn: '9780140410341',
        existingUrl: 'https://example.com/tiny.jpg',
      })

      expect(result).not.toBe('https://example.com/tiny.jpg')
    })

    it('rejects non-image content types', async () => {
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({ contentType: 'application/json' }),
      )
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({ contentLength: '50000' }),
      )

      const result = await resolveCoverUrl({
        isbn: '9780140410341',
        existingUrl: 'https://example.com/data.json',
      })

      expect(result).not.toBe('https://example.com/data.json')
    })

    it('rejects when post-redirect URL fails SSRF validation', async () => {
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({
          url: 'https://169.254.169.254/latest/meta-data',
          contentLength: '50000',
        }),
      )
      mockFetch.mockResolvedValueOnce(
        mockImageResponse({ contentLength: '50000' }),
      )

      const result = await resolveCoverUrl({
        isbn: '9780140410341',
        existingUrl: 'https://example.com/redirect-to-internal.jpg',
      })

      expect(result).not.toBe('https://example.com/redirect-to-internal.jpg')
    })

    it('handles fetch timeout gracefully', async () => {
      mockFetch.mockRejectedValue(new DOMException('Aborted', 'AbortError'))

      const result = await resolveCoverUrl({
        isbn: '9780140410341',
        existingUrl: 'https://example.com/slow.jpg',
        timeout: 100,
      })

      expect(result).toBeNull()
    })
  })

  describe('queryLongitood (via resolveCoverUrl)', () => {
    it('handles 404 from longitood API', async () => {
      // All direct candidates fail
      mockFetch.mockResolvedValue(
        mockImageResponse({ contentLength: '100' }),
      )

      // Override for longitood JSON call
      const calls: string[] = []
      mockFetch.mockImplementation((url: string) => {
        calls.push(url)
        if (url.includes('longitood.com')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            url,
            headers: { get: () => null },
            body: { cancel: () => Promise.resolve() },
          })
        }
        return Promise.resolve(mockImageResponse({ contentLength: '100' }))
      })

      const result = await resolveCoverUrl({ isbn: '9780140410341' })
      expect(result).toBeNull()
    })

    it('handles invalid JSON from longitood API', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('longitood.com')) {
          return Promise.resolve({
            ok: true,
            url,
            headers: { get: () => null },
            json: () => Promise.resolve({ error: 'not found' }),
            body: { cancel: () => Promise.resolve() },
          })
        }
        return Promise.resolve(mockImageResponse({ contentLength: '100' }))
      })

      const result = await resolveCoverUrl({ isbn: '9780140410341' })
      expect(result).toBeNull()
    })

    it('rejects placeholder URLs from longitood response', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('longitood.com')) {
          return Promise.resolve({
            ok: true,
            url,
            headers: { get: () => null },
            json: () =>
              Promise.resolve({ url: 'https://example.com/nophoto/default.jpg' }),
            body: { cancel: () => Promise.resolve() },
          })
        }
        return Promise.resolve(mockImageResponse({ contentLength: '100' }))
      })

      const result = await resolveCoverUrl({ isbn: '9780140410341' })
      expect(result).toBeNull()
    })
  })
})
