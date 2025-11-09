/**
 * Google Books API Integration
 *
 * Provides book lookup functionality using Google Books API
 * Documentation: https://developers.google.com/books/docs/v1/using
 */

import { cleanISBN } from './isbnUtils'

/**
 * Google Books API response structure
 */
interface GoogleBooksVolumeInfo {
  title: string
  subtitle?: string
  authors?: string[]
  publisher?: string
  publishedDate?: string
  description?: string
  pageCount?: number
  categories?: string[]
  imageLinks?: {
    thumbnail?: string
    smallThumbnail?: string
    small?: string
    medium?: string
    large?: string
    extraLarge?: string
  }
  industryIdentifiers?: Array<{
    type: 'ISBN_10' | 'ISBN_13' | 'ISSN' | 'OTHER'
    identifier: string
  }>
}

interface GoogleBooksItem {
  volumeInfo: GoogleBooksVolumeInfo
}

interface GoogleBooksResponse {
  kind: string
  totalItems: number
  items?: GoogleBooksItem[]
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
  source: 'googlebooks'
}

/**
 * In-memory cache with TTL and LRU eviction
 */
class GoogleBooksCache {
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

const cache = new GoogleBooksCache()

/**
 * Fetch book data from Google Books API
 *
 * @param isbn - ISBN-10 or ISBN-13
 * @returns Google Books API response or null
 */
async function fetchFromGoogleBooks(isbn: string): Promise<GoogleBooksItem | null> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY // Optional, for higher rate limits
  const baseUrl = 'https://www.googleapis.com/books/v1/volumes'
  const params = new URLSearchParams({
    q: `isbn:${isbn}`,
    ...(apiKey && { key: apiKey }),
  })

  try {
    const response = await fetch(`${baseUrl}?${params}`, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      console.warn(`[Google Books] HTTP ${response.status} for ISBN ${isbn}`)
      return null
    }

    const data: GoogleBooksResponse = await response.json()

    if (data.totalItems === 0 || !data.items || data.items.length === 0) {
      console.log(`[Google Books] No results for ISBN ${isbn}`)
      return null
    }

    // Return the first item (most relevant)
    return data.items[0]
  } catch (error) {
    console.error(`[Google Books] Error fetching ISBN ${isbn}:`, error)
    return null
  }
}

/**
 * Transform Google Books API data to our standard format
 *
 * @param item - Google Books item
 * @param isbn - Original ISBN
 * @returns Standardised book data
 */
function transformGoogleBooksData(item: GoogleBooksItem, isbn: string): BookLookupResult['data'] {
  const volumeInfo = item.volumeInfo

  // Extract author (join multiple authors with comma)
  const author = volumeInfo.authors?.join(', ') || 'Unknown Author'

  // Extract cover image (prefer larger sizes)
  let coverImageUrl: string | undefined
  if (volumeInfo.imageLinks) {
    coverImageUrl =
      volumeInfo.imageLinks.large ||
      volumeInfo.imageLinks.medium ||
      volumeInfo.imageLinks.small ||
      volumeInfo.imageLinks.thumbnail ||
      volumeInfo.imageLinks.smallThumbnail
  }

  // Replace http:// with https:// for cover images
  if (coverImageUrl && coverImageUrl.startsWith('http://')) {
    coverImageUrl = coverImageUrl.replace('http://', 'https://')
  }

  // Extract subjects (categories)
  const subjects = volumeInfo.categories?.filter((cat) => cat.trim().length > 0)

  return {
    title: volumeInfo.title,
    author,
    publisher: volumeInfo.publisher,
    publishedDate: volumeInfo.publishedDate,
    description: volumeInfo.description,
    coverImageUrl,
    isbn: cleanISBN(isbn),
    pages: volumeInfo.pageCount,
    subjects,
  }
}

/**
 * Look up book by ISBN using Google Books API
 *
 * @param isbn - ISBN-10 or ISBN-13 (with or without hyphens)
 * @returns Book data or error
 */
export async function lookupBookByISBN(isbn: string): Promise<BookLookupResult> {
  const cleaned = cleanISBN(isbn)

  // Check cache first
  const cached = cache.get(cleaned)
  if (cached) {
    console.log(`[Google Books] Cache hit for ISBN ${cleaned}`)
    return cached
  }

  try {
    const item = await fetchFromGoogleBooks(isbn)

    if (!item) {
      const result: BookLookupResult = {
        success: false,
        error: 'Book not found in Google Books',
        source: 'googlebooks',
      }
      cache.set(cleaned, result)
      return result
    }

    const result: BookLookupResult = {
      success: true,
      data: transformGoogleBooksData(item, isbn),
      source: 'googlebooks',
    }

    cache.set(cleaned, result)
    return result
  } catch (error) {
    const result: BookLookupResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'googlebooks',
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
