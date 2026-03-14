/**
 * Cover Image Resolver
 *
 * A dedicated waterfall for finding a real book cover image URL.
 * Separate from the metadata lookup — a source may have good metadata but
 * no cover, while a different source may have a cover even without a record.
 *
 * Waterfall order:
 *   1. existingUrl         — cover URL returned by the metadata lookup (tried first)
 *   2. GB fife variant     — existingUrl modified with fife=w800 (Google Books only)
 *   3. OL CDN ISBN-13      — covers.openlibrary.org/b/isbn/{isbn13}-L.jpg
 *   4. OL CDN ISBN-10      — covers.openlibrary.org/b/isbn/{isbn10}-L.jpg
 *   5. bookcover.longitood.com — JSON API aggregator (Goodreads CDN); last resort
 *
 * Each probe has an independent 5 s timeout so a slow/dead source never
 * stalls the entire chain. Timeouts and fetch errors return false and the
 * next candidate is tried immediately.
 *
 * Notes on HEAD vs GET:
 *   Open Library's CDN (and several others) omit Content-Length on HEAD
 *   responses, making HEAD probes unreliable for size checking. We always
 *   perform a Range: bytes=0-N GET to obtain a real byte count. This is
 *   still far cheaper than a full download — we stop reading after we have
 *   enough data to confirm the file is large enough (≥ 15 KB).
 *
 * @module bookLookup/coverResolver
 */

import { cleanISBN, convertISBN10to13 } from '../isbnUtils'
import { MIN_COVER_SIZE, isPlaceholderUrl } from '../openLibrary/imageDownloader'
import { validateImageURL } from '../urlValidator'

/**
 * Per-probe timeout in milliseconds.
 * Kept short so a dead source never stalls the whole waterfall.
 */
const PROBE_TIMEOUT_MS = 5_000

/**
 * Derives a larger-image variant of a Google Books URL by appending the
 * `fife` image-serving parameter.  Returns an empty array for non-GB URLs.
 *
 * Google Books serves images via two URL forms:
 *  - books.google.com/books/content?…  (zoom= parameter)
 *  - lh3.googleusercontent.com/…       (fife= size suffix)
 *
 * The zoom=0 tweak in googleBooks.ts already maximises size for the first
 * form. The fife parameter addresses the second form and also sometimes
 * unlocks larger images on the first form.
 */
function googleBooksVariants(url: string): string[] {
  if (!url.includes('books.google.com') && !url.includes('lh3.googleusercontent.com')) {
    return []
  }
  if (url.includes('fife=')) {
    // Already has a fife param — try replacing it with a larger value
    return [url.replace(/fife=[^&]+/, 'fife=w800')]
  }
  const separator = url.includes('?') ? '&' : '?'
  return [`${url}${separator}fife=w800`]
}

/**
 * Probes a URL to determine whether it points to a real cover image.
 *
 * Uses a Range GET (bytes 0 – MIN_COVER_SIZE) rather than HEAD because several
 * CDNs (including Open Library) omit Content-Length on HEAD responses.
 * The Content-Range response header or the actual chunk size tells us
 * whether the full file meets the minimum size threshold.
 *
 * Each probe runs inside its own AbortController so a timeout on one
 * candidate does not affect subsequent probes.
 *
 * @param url     - HTTPS URL to probe
 * @param timeout - Abort timeout in milliseconds (default: PROBE_TIMEOUT_MS)
 * @returns true if the URL appears to be a real, non-placeholder image
 */
async function probeImageUrl(url: string, timeout: number = PROBE_TIMEOUT_MS): Promise<boolean> {
  // Fast-path rejections — no network needed
  if (isPlaceholderUrl(url)) return false

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    // Defense-in-depth: block private/internal IPs even if callers forgot to validate
    if (!validateImageURL(url)) return false
  } catch {
    return false
  }

  // Each probe gets its own independent controller
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Infoshop-Payload/1.0 (Bookstore Inventory System)',
        // Request only the first chunk — server may honour with 206 or return 200
        Range: `bytes=0-${MIN_COVER_SIZE - 1}`,
      },
      signal: controller.signal,
      redirect: 'follow',
    })

    // Helper to release the response body and prevent socket leaks
    const releaseBody = () => response.body?.cancel().catch(() => {})

    // Accept any 2xx (200 when Range ignored, 206 when Range honoured)
    if (!response.ok) {
      releaseBody()
      return false
    }

    // Final URL after redirects must pass SSRF validation
    if (response.url && !validateImageURL(response.url)) {
      releaseBody()
      return false
    }

    // Must be an image content type
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.startsWith('image/')) {
      releaseBody()
      return false
    }

    // --- Primary size check: Content-Range tells us the full file size ---
    // Format: "bytes 0-N/TOTAL" on 206 responses
    const contentRange = response.headers.get('content-range')
    if (contentRange) {
      const match = /\/(\d+)$/.exec(contentRange)
      if (match) {
        const totalBytes = parseInt(match[1], 10)
        releaseBody()
        return !isNaN(totalBytes) && totalBytes >= MIN_COVER_SIZE
      }
    }

    // --- Secondary: Content-Length (reliable when server returns 200) ---
    const contentLength = response.headers.get('content-length')
    if (contentLength) {
      const bytes = parseInt(contentLength, 10)
      if (!isNaN(bytes)) {
        releaseBody()
        return bytes >= MIN_COVER_SIZE
      }
    }

    // --- Fallback: read the body incrementally ---
    // For a 206, receiving MIN_COVER_SIZE proves the file is at least that large.
    // For a 200, we read only until we've confirmed MIN_COVER_SIZE to avoid
    // buffering an entire large image just for a size probe.
    const reader = response.body?.getReader()
    if (!reader) return false

    let totalRead = 0
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        totalRead += value.byteLength
        if (totalRead >= MIN_COVER_SIZE) return true
      }
    } finally {
      reader.cancel().catch(() => {})
    }

    return false
  } catch {
    // Timeout, network error, etc. — treat as not found, try next candidate
    return false
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Queries the bookcover.longitood.com JSON API for a cover image URL.
 *
 * The API returns `{ "url": "https://..." }` on success or 404 when not found.
 * We fetch the JSON, extract the image URL, then probe it for size/validity.
 *
 * The total budget for this step is `timeout` ms, split between the JSON
 * fetch and the image probe to avoid exceeding the per-source contract.
 *
 * @param isbnValue - ISBN to look up (ISBN-10 or ISBN-13)
 * @param timeout   - Total budget in milliseconds for both fetch + probe
 * @returns A validated image URL, or null
 */
async function queryLongitood(isbnValue: string, timeout: number): Promise<string | null> {
  const start = Date.now()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(
      `https://bookcover.longitood.com/bookcover?isbn=${isbnValue}&image_size=large`,
      {
        headers: {
          'User-Agent': 'Infoshop-Payload/1.0 (Bookstore Inventory System)',
          Accept: 'application/json',
        },
        signal: controller.signal,
      },
    )

    if (!response.ok) return null

    // SSRF check on final URL after any redirects
    if (response.url && !validateImageURL(response.url)) return null

    const data = (await response.json()) as { url?: string }
    if (!data.url || typeof data.url !== 'string') return null

    // Validate the returned image URL
    if (isPlaceholderUrl(data.url)) return null
    if (!validateImageURL(data.url)) return null

    // Probe the image URL with the remaining time budget
    const elapsed = Date.now() - start
    const remaining = Math.max(timeout - elapsed, 1_000)
    const isReal = await probeImageUrl(data.url, remaining)
    return isReal ? data.url : null
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Options for cover URL resolution
 */
export interface ResolveCoverOptions {
  /** Raw ISBN string (ISBN-10 or ISBN-13, with or without hyphens) */
  isbn: string
  /** Cover URL already obtained from the metadata lookup, if any */
  existingUrl?: string
  /** Per-probe timeout in milliseconds (default: 5 000) */
  timeout?: number
}

/**
 * Resolves the best available cover image URL for a book.
 *
 * Probes multiple sources in sequence, returning the first URL that passes
 * the size check (≥ 15 KB, non-placeholder).  Each source has an independent
 * timeout so a slow/dead source never stalls the chain.
 *
 * Returns null if no valid cover is found across all sources.
 *
 * @param options - ISBN and optional existing URL from metadata lookup
 * @returns HTTPS URL of a confirmed real cover image, or null
 */
export async function resolveCoverUrl(options: ResolveCoverOptions): Promise<string | null> {
  const { isbn, existingUrl, timeout = PROBE_TIMEOUT_MS } = options

  const cleaned = cleanISBN(isbn)

  // Reject obviously invalid ISBN lengths
  if (cleaned.length !== 10 && cleaned.length !== 13) return null

  // Derive both ISBN forms for OL CDN probes
  let isbn13: string | undefined
  let isbn10: string | undefined

  if (cleaned.length === 13) {
    isbn13 = cleaned
  } else {
    isbn10 = cleaned
    isbn13 = convertISBN10to13(cleaned) ?? undefined
  }

  // Build candidate list
  const candidates: string[] = []

  // 1. Existing URL from metadata lookup (highest priority)
  if (existingUrl) {
    candidates.push(existingUrl)

    // 2. Google Books fife variant (only applies to GB URLs)
    candidates.push(...googleBooksVariants(existingUrl))
  }

  // 3. Open Library Covers CDN — direct by ISBN-13 (only if we have one)
  if (isbn13) {
    candidates.push(`https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg`)
  }

  // 4. Open Library Covers CDN — direct by ISBN-10 (if available and different)
  if (isbn10 && isbn10 !== isbn13) {
    candidates.push(`https://covers.openlibrary.org/b/isbn/${isbn10}-L.jpg`)
  }

  // Probe each candidate in sequence; stop at first success
  for (const url of candidates) {
    const isReal = await probeImageUrl(url, timeout)
    if (isReal) {
      return url
    }
  }

  // 5. bookcover.longitood.com — JSON API aggregator (last resort)
  // Handled separately because it returns JSON { url: "..." } not an image.
  // Uses isbn13 if available, otherwise isbn10 (API accepts either).
  const longitoodIsbn = isbn13 ?? isbn10 ?? cleaned
  const longitoodUrl = await queryLongitood(longitoodIsbn, timeout)
  if (longitoodUrl) return longitoodUrl

  return null
}
