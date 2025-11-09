/**
 * WorldCat Classify API Integration
 *
 * Provides book lookup functionality using OCLC's WorldCat Classify API
 * Documentation: http://classify.oclc.org/classify2/api_docs/index.html
 *
 * Note: This is a free API with no authentication required
 */

import { cleanISBN, convertISBN10to13 } from './isbnUtils'

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

interface WorldCatRecommendations {
  ddc?: Array<{ mostPopular?: string; nsfa?: string }> // Dewey Decimal
  lcc?: Array<{ mostPopular?: string; nsfa?: string }> // Library of Congress
  fast?: Array<{ nsfa?: string; headings?: string[] }> // FAST subject headings
}

/**
 * Book lookup result
 */
export interface BookLookupResult {
  success: boolean
  data?: {
    title: string
    author: string
    publisher?: string
    publishedDate?: string
    description?: string
    coverImageUrl?: string
    isbn: string
    oclcNumber?: string
    pages?: number
    subjects?: string[]
  }
  error?: string
  source: 'worldcat'
}

/**
 * In-memory cache with TTL and LRU eviction
 */
class WorldCatCache {
  private cache: Map<string, { data: BookLookupResult; timestamp: number }> = new Map()
  private ttl: number = 1000 * 60 * 60 * 24 // 24 hours
  private maxSize: number = 1000 // Maximum cache entries

  set(isbn: string, data: BookLookupResult): void {
    // If at max size, remove oldest entry (LRU)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(isbn, {
      data,
      timestamp: Date.now(),
    })
  }

  get(isbn: string): BookLookupResult | null {
    const cached = this.cache.get(isbn)
    if (!cached) return null

    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(isbn)
      return null
    }

    // Move to end (mark as recently used)
    this.cache.delete(isbn)
    this.cache.set(isbn, cached)

    return cached.data
  }

  clear(): void {
    this.cache.clear()
  }
}

const cache = new WorldCatCache()

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
  } catch (error) {
    console.error('[WorldCat] Error parsing XML:', error)
    return null
  }
}

/**
 * Extract FAST subject headings from XML
 *
 * @param xml - XML response string
 * @returns Array of subject headings
 */
function extractSubjects(xml: string): string[] {
  const subjects: string[] = []

  try {
    // Extract FAST headings (most reliable subject data from WorldCat)
    const fastMatches = xml.matchAll(/<heading[^>]*>([^<]+)<\/heading>/g)
    for (const match of fastMatches) {
      const heading = match[1].trim()
      if (heading && !subjects.includes(heading)) {
        subjects.push(heading)
      }
    }
  } catch (error) {
    console.error('[WorldCat] Error extracting subjects:', error)
  }

  return subjects
}

/**
 * Fetch book data from WorldCat Classify API
 *
 * @param isbn - ISBN-10 or ISBN-13
 * @returns Parsed work data or null
 */
async function fetchFromWorldCat(isbn: string): Promise<WorldCatWork | null> {
  const baseUrl = 'http://classify.oclc.org/classify2/Classify'
  const params = new URLSearchParams({
    isbn: isbn,
    summary: 'true', // Get summary with work-level data
  })

  try {
    const response = await fetch(`${baseUrl}?${params}`, {
      headers: {
        Accept: 'application/xml',
      },
    })

    if (!response.ok) {
      console.warn(`[WorldCat] HTTP ${response.status} for ISBN ${isbn}`)
      return null
    }

    const xml = await response.text()

    // Check response code in XML
    const responseMatch = xml.match(/<response code="(\d+)"/)
    if (!responseMatch) {
      console.warn('[WorldCat] Invalid XML response')
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
      console.log(`[WorldCat] No results for ISBN ${isbn}`)
      return null
    }

    if (!['0', '2', '4'].includes(responseCode)) {
      console.warn(`[WorldCat] Error response code ${responseCode} for ISBN ${isbn}`)
      return null
    }

    return parseWorldCatXML(xml)
  } catch (error) {
    console.error(`[WorldCat] Error fetching ISBN ${isbn}:`, error)
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
function transformWorldCatData(work: WorldCatWork, isbn: string): BookLookupResult['data'] {
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
    description: undefined,
    coverImageUrl: undefined,
    pages: undefined,
    subjects: undefined, // Could extract FAST headings but they're very technical
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

  // Check cache first
  const cached = cache.get(cleaned)
  if (cached) {
    console.log(`[WorldCat] Cache hit for ISBN ${cleaned}`)
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
