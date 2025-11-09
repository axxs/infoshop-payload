/**
 * WorldCat Classify API Integration
 *
 * Provides book lookup functionality using OCLC's WorldCat Classify API
 * Documentation: http://classify.oclc.org/classify2/api_docs/index.html
 *
 * Note: This is a free API with no authentication required
 * Security note: Uses HTTP as OCLC only provides HTTP endpoint
 */

import { cleanISBN, validateISBN } from '../isbnUtils'
import type { BookLookupResult, BookData } from './types'
import { LRUCache } from './cache'
import { TIMEOUT } from './config'

/**
 * WorldCat Classify API response structure (simplified XML response)
 */
interface WorldCatWork {
  title?: string
  author?: string
  heldby?: string // Number of libraries holding this work
  editions?: string
  owi?: string // OCLC Work Identifier
}

// Shared cache instance for WorldCat Classify API results
const cache = new LRUCache<BookLookupResult>()

/**
 * Parse XML response from WorldCat Classify API
 *
 * Note: Using basic string parsing instead of full XML parser for simplicity
 * and to avoid additional dependencies. This works for the simple structure
 * of WorldCat Classify responses.
 *
 * @param xml - XML response string
 * @returns Parsed work data or null
 */
function parseWorldCatXML(xml: string): WorldCatWork | null {
  try {
    // Extract work element
    const workMatch = xml.match(/<work[^>]*>([\s\S]*?)<\/work>/)
    if (!workMatch) {
      return null
    }

    const work = workMatch[1]

    // Extract title
    const titleMatch = work.match(/<title>([^<]+)<\/title>/)
    const title = titleMatch ? titleMatch[1].trim() : undefined

    // Extract author
    const authorMatch = work.match(/<author[^>]*>([^<]+)<\/author>/)
    const author = authorMatch ? authorMatch[1].trim() : undefined

    // Extract OCLC Work Identifier
    const owiMatch = work.match(/owi="([^"]+)"/)
    const owi = owiMatch ? owiMatch[1] : undefined

    // Extract holdings count
    const heldbyMatch = work.match(/heldby="([^"]+)"/)
    const heldby = heldbyMatch ? heldbyMatch[1] : undefined

    if (!title) {
      return null
    }

    return {
      title,
      author,
      owi,
      heldby,
    }
  } catch {
    return null
  }
}

/**
 * Fetch book data from WorldCat Classify API
 *
 * Security note: OCLC Classify API only supports HTTP (not HTTPS).
 * While ISBNs are not sensitive data, this exposes queries to potential MITM attacks.
 * Consider using alternative sources (Google Books, OpenLibrary) for production.
 *
 * @param isbn - ISBN-10 or ISBN-13
 * @returns Parsed work data or null
 */
async function fetchFromWorldCat(isbn: string): Promise<WorldCatWork | null> {
  const params = new URLSearchParams({
    isbn: isbn,
    summary: 'true', // Get summary with work-level data
  })

  // SECURITY WARNING: OCLC Classify only supports HTTP (insecure)
  // This is a known limitation of the OCLC service
  const url = `http://classify.oclc.org/classify2/Classify?${params}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT.WORLDCAT)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/xml',
      },
    })

    if (!response.ok) {
      clearTimeout(timeoutId)
      return null
    }

    clearTimeout(timeoutId)
    const xml = await response.text()

    // Check response code in XML
    const responseMatch = xml.match(/<response code="(\d+)"/)
    if (!responseMatch) {
      return null
    }

    const responseCode = responseMatch[1]

    // Response codes:
    // 0 = Single work found (success)
    // 2 = Single work editions found (success)
    // 4 = Multiple works found (we'll use first)
    // 100 = No input (error)
    // 101 = Invalid input (error)
    // 102 = Not found (error)
    // 200 = Unexpected error (error)

    if (responseCode === '102') {
      return null
    }

    if (!['0', '2', '4'].includes(responseCode)) {
      return null
    }

    return parseWorldCatXML(xml)
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      return null
    }
    return null
  }
}

/**
 * Transform WorldCat data to our standard format
 *
 * @param work - WorldCat work data
 * @param isbn - Original ISBN
 * @returns Standardised book data
 */
function transformWorldCatData(work: WorldCatWork, isbn: string): BookData {
  // Note: WorldCat Classify doesn't provide cover images, descriptions, or publisher info
  // It's primarily a cataloguing/classification service
  return {
    title: work.title || 'Unknown Title',
    author: work.author || 'Unknown Author',
    isbn: cleanISBN(isbn),
    oclcNumber: work.owi,
    // WorldCat doesn't provide these fields:
    publisher: undefined,
    publishedDate: undefined,
    synopsis: undefined,
    coverImageUrl: undefined,
    pages: undefined,
    subjects: undefined,
  }
}

/**
 * Look up book by ISBN using WorldCat Classify API
 *
 * @param isbn - ISBN-10 or ISBN-13 (with or without hyphens)
 * @returns Book data or error
 */
export async function lookupBookByISBN(isbn: string): Promise<BookLookupResult> {
  const cleaned = cleanISBN(isbn)

  // Validate ISBN format
  const validation = validateISBN(cleaned)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Invalid ISBN format',
      source: 'worldcat',
    }
  }

  // Check cache first
  const cached = cache.get(cleaned)
  if (cached) {
    return cached
  }

  try {
    const work = await fetchFromWorldCat(isbn)

    if (!work) {
      const result: BookLookupResult = {
        success: false,
        error: 'Book not found in WorldCat',
        source: 'worldcat',
      }
      cache.set(cleaned, result)
      return result
    }

    const result: BookLookupResult = {
      success: true,
      data: transformWorldCatData(work, isbn),
      source: 'worldcat',
    }

    cache.set(cleaned, result)
    return result
  } catch (error) {
    const result: BookLookupResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'worldcat',
    }
    return result
  }
}

/**
 * Clear the cache (useful for testing)
 */
export function clearCache(): void {
  cache.clear()
}
