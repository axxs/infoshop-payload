/**
 * Shared types for book lookup system
 */

/**
 * Supported book lookup sources
 */
export type BookLookupSource = 'googlebooks' | 'openlibrary' | 'worldcat'

/**
 * Standardised book data structure
 */
export interface BookData {
  title: string
  author: string
  publisher?: string
  publishedDate?: string
  synopsis?: string
  coverImageUrl?: string
  isbn: string
  oclcNumber?: string
  pages?: number
  subjects?: string[]
}

/**
 * Book lookup result from any source
 */
export interface BookLookupResult {
  success: boolean
  data?: BookData
  error?: string
  source: BookLookupSource
  attemptedSources?: string[]
  fallbackUsed?: boolean
}
