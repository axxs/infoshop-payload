/**
 * Google Books API Integration
 *
 * Provides book lookup functionality using Google Books API
 * Documentation: https://developers.google.com/books/docs/v1/using
 */

import { cleanISBN, validateISBN } from '../isbnUtils'
import type { BookLookupResult, BookData } from './types'
import { LRUCache } from './cache'
import { TIMEOUT } from './config'

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

// Shared cache instance for Google Books API results
const cache = new LRUCache<BookLookupResult>()

/**
 * Fetch book data from Google Books API with timeout
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

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT.GOOGLE_BOOKS)

  try {
    const response = await fetch(`${baseUrl}?${params}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return null
    }

    const data: GoogleBooksResponse = await response.json()

    if (data.totalItems === 0 || !data.items || data.items.length === 0) {
      return null
    }

    // Return the first item (most relevant)
    return data.items[0]
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      return null
    }
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
function transformGoogleBooksData(item: GoogleBooksItem, isbn: string): BookData {
  const volumeInfo = item.volumeInfo

  // Extract author (join multiple authors with comma)
  const author = volumeInfo.authors?.join(', ') || 'Unknown Author'

  // Extract cover image (prefer larger sizes)
  let coverImageUrl: string | undefined
  if (volumeInfo.imageLinks) {
    coverImageUrl =
      volumeInfo.imageLinks.extraLarge ||
      volumeInfo.imageLinks.large ||
      volumeInfo.imageLinks.medium ||
      volumeInfo.imageLinks.small ||
      volumeInfo.imageLinks.thumbnail ||
      volumeInfo.imageLinks.smallThumbnail
  }

  // Replace http:// with https:// for cover images
  if (coverImageUrl?.startsWith('http://')) {
    coverImageUrl = coverImageUrl.replace('http://', 'https://')
  }

  // Maximize image quality by modifying zoom parameter
  // Google Books uses zoom=1 for thumbnails, zoom=0 for original/max size
  if (coverImageUrl && coverImageUrl.includes('zoom=')) {
    coverImageUrl = coverImageUrl.replace(/zoom=\d/, 'zoom=0')
  }

  // Extract subjects (categories)
  const subjects = volumeInfo.categories?.filter((cat) => cat.trim().length > 0)

  return {
    title: volumeInfo.title,
    author,
    publisher: volumeInfo.publisher,
    publishedDate: volumeInfo.publishedDate,
    synopsis: volumeInfo.description,
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

  // Validate ISBN format
  const validation = validateISBN(cleaned)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Invalid ISBN format',
      source: 'googlebooks',
    }
  }

  // Check cache first
  const cached = cache.get(cleaned)
  if (cached) {
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
