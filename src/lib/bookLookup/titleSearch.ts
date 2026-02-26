/**
 * Title+Author Fallback Lookup
 *
 * When ISBN lookup fails (or there is no ISBN), this module searches
 * Google Books and Open Library by title+author, validates the results
 * with fuzzy matching, and returns the best match.
 *
 * @module bookLookup/titleSearch
 */

import * as GoogleBooks from './googleBooks'
import * as OpenLibrary from './openLibrary'
import { LRUCache } from './cache'
import { TITLE_SEARCH } from './config'
import type { BookData, BookLookupResult } from './types'

/** Dedicated cache for title search results */
const titleCache = new LRUCache<BookLookupResult>()

/**
 * Normalise a string for comparison: lowercase, strip diacritics,
 * remove punctuation, and collapse whitespace.
 */
export function normalizeForComparison(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // remove punctuation
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Build bigrams (character pairs) from a string.
 */
function bigrams(str: string): Set<string> {
  const result = new Set<string>()
  for (let i = 0; i < str.length - 1; i++) {
    result.add(str.slice(i, i + 2))
  }
  return result
}

/**
 * Dice coefficient: 2 * |intersection| / (|A| + |B|)
 *
 * Returns a similarity score between 0.0 (no overlap) and 1.0 (identical).
 * Handles word reordering well (e.g. "Bakunin, Mikhail" vs "Mikhail Bakunin").
 */
export function diceCoefficient(a: string, b: string): number {
  const normA = normalizeForComparison(a)
  const normB = normalizeForComparison(b)

  if (normA === normB) return 1.0
  if (normA.length < 2 || normB.length < 2) return 0.0

  const bigramsA = bigrams(normA)
  const bigramsB = bigrams(normB)

  let intersection = 0
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++
  }

  return (2 * intersection) / (bigramsA.size + bigramsB.size)
}

/**
 * Validate that a candidate result actually matches the query.
 *
 * Uses Dice coefficient with configurable thresholds to prevent
 * false positives from the APIs' fuzzy search.
 *
 * @param queryTitle - The title we searched for
 * @param queryAuthor - The author we searched for (may be undefined)
 * @param candidateTitle - The candidate result's title
 * @param candidateAuthor - The candidate result's author
 * @returns true if the result is a plausible match
 */
export function isResultMatch(
  queryTitle: string,
  queryAuthor: string | undefined,
  candidateTitle: string,
  candidateAuthor: string,
): boolean {
  const titleScore = diceCoefficient(queryTitle, candidateTitle)
  if (titleScore < TITLE_SEARCH.TITLE_THRESHOLD) return false

  if (queryAuthor) {
    const authorScore = diceCoefficient(queryAuthor, candidateAuthor)
    if (authorScore < TITLE_SEARCH.AUTHOR_THRESHOLD) return false
  }

  return true
}

/**
 * Build a cache key from title + author
 */
function cacheKey(title: string, author?: string): string {
  const normTitle = normalizeForComparison(title)
  const normAuthor = author ? normalizeForComparison(author) : ''
  return `title:${normTitle}|author:${normAuthor}`
}

/**
 * Look up a book by title and optional author.
 *
 * Waterfall strategy: Google Books → OpenLibrary.
 * Each source's candidates are validated with fuzzy matching before acceptance.
 *
 * @param title - Book title to search for
 * @param author - Optional author name
 * @returns BookLookupResult with best matching data, or failure
 */
export async function lookupBookByTitle(
  title: string,
  author?: string,
): Promise<BookLookupResult> {
  const key = cacheKey(title, author)

  const cached = titleCache.get(key)
  if (cached) return cached

  const attemptedSources: string[] = []

  // 1. Try Google Books
  attemptedSources.push('Google Books (title)')
  try {
    const candidates = await GoogleBooks.searchByTitle(title, author)
    const match = findBestMatch(candidates, title, author)
    if (match) {
      const result: BookLookupResult = {
        success: true,
        data: match,
        source: 'googlebooks',
        attemptedSources,
        fallbackUsed: false,
      }
      titleCache.set(key, result)
      return result
    }
  } catch {
    // Continue to next source
  }

  // 2. Try OpenLibrary
  attemptedSources.push('OpenLibrary (title)')
  try {
    const candidates = await OpenLibrary.searchByTitle(title, author)
    const match = findBestMatch(candidates, title, author)
    if (match) {
      const result: BookLookupResult = {
        success: true,
        data: match,
        source: 'openlibrary',
        attemptedSources,
        fallbackUsed: true,
      }
      titleCache.set(key, result)
      return result
    }
  } catch {
    // Continue to failure
  }

  const result: BookLookupResult = {
    success: false,
    error: `No matching book found by title+author. Tried: ${attemptedSources.join(', ')}`,
    source: 'googlebooks',
    attemptedSources,
    fallbackUsed: false,
  }
  titleCache.set(key, result)
  return result
}

/**
 * Find the best fuzzy-matched candidate from an array of BookData results.
 */
function findBestMatch(
  candidates: BookData[],
  queryTitle: string,
  queryAuthor?: string,
): BookData | null {
  let bestMatch: BookData | null = null
  let bestScore = 0

  for (const candidate of candidates) {
    if (!isResultMatch(queryTitle, queryAuthor, candidate.title, candidate.author)) {
      continue
    }

    const titleScore = diceCoefficient(queryTitle, candidate.title)
    const authorScore = queryAuthor ? diceCoefficient(queryAuthor, candidate.author) : 0
    const combinedScore = queryAuthor ? titleScore * 0.6 + authorScore * 0.4 : titleScore

    if (combinedScore > bestScore) {
      bestScore = combinedScore
      bestMatch = candidate
    }
  }

  return bestMatch
}

/**
 * Clear the title search cache (useful for testing)
 */
export function clearTitleCache(): void {
  titleCache.clear()
}
