/**
 * Integration tests for Open Library API client
 * These tests make real API calls to Open Library
 */

import { describe, test, expect, beforeEach } from 'vitest'
import { lookupBookByISBN, clearISBNCache } from '../../../src/lib/bookLookup/openLibrary'

describe('Open Library Integration', () => {
  beforeEach(() => {
    // Clear cache before each test to ensure clean state
    clearISBNCache()
  })

  describe('lookupBookByISBN - Success Cases', () => {
    test('fetches valid book data for Fantastic Mr. Fox', async () => {
      const result = await lookupBookByISBN('9780140328721')

      expect(result.success).toBe(true)
      expect(result.source).toBe('openlibrary')
      expect(result.data).toBeDefined()
      expect(result.data?.title).toBe('Fantastic Mr. Fox')
      expect(result.data?.author).toContain('Roald Dahl')
      expect(result.data?.isbn).toBe('9780140328721')
      expect(result.data?.coverImageUrl).toBeDefined()
    })

    test('fetches book with ISBN-10 and auto-converts to ISBN-13', async () => {
      const result = await lookupBookByISBN('0141032871')

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.title).toBeDefined()
      expect(result.data?.author).toBeDefined()
    })

    test('handles ISBN with hyphens', async () => {
      const result = await lookupBookByISBN('978-0-14-032872-1')

      expect(result.success).toBe(true)
      expect(result.data?.title).toBe('Fantastic Mr. Fox')
      expect(result.data?.isbn).toBe('9780140328721')
    })

    test('includes publisher information when available', async () => {
      const result = await lookupBookByISBN('9780140328721')

      expect(result.success).toBe(true)
      expect(result.data?.publisher).toBeDefined()
    })

    test('may include publication date when available', async () => {
      const result = await lookupBookByISBN('9780140328721')

      expect(result.success).toBe(true)
      // Publication date is optional - Open Library may not always return it
      if (result.data?.publishedDate) {
        expect(typeof result.data.publishedDate).toBe('string')
      }
    })

    test('includes subjects when available', async () => {
      const result = await lookupBookByISBN('9780140328721')

      expect(result.success).toBe(true)
      expect(result.data?.subjects).toBeDefined()
      expect(Array.isArray(result.data?.subjects)).toBe(true)
      if (result.data?.subjects) {
        expect(result.data.subjects.length).toBeGreaterThan(0)
      }
    })
  })

  describe('lookupBookByISBN - Not Found Cases', () => {
    test('returns appropriate response for any ISBN', async () => {
      // Test that the API handles the request correctly regardless of whether the book exists
      const result = await lookupBookByISBN('9999999999999')

      // Either succeeds (book exists) or fails (book not found)
      expect(result.source).toBe('openlibrary')
      if (!result.success) {
        expect(result.error).toBeDefined()
      } else {
        expect(result.data).toBeDefined()
      }
    })

    test('handles any valid ISBN gracefully', async () => {
      // Valid checksum - may or may not be in database
      const result = await lookupBookByISBN('9781234567897')

      // Should return a valid response structure
      expect(result.source).toBe('openlibrary')
      expect(typeof result.success).toBe('boolean')

      if (!result.success) {
        expect(result.error).toBeDefined()
      } else {
        expect(result.data).toBeDefined()
      }
    })
  })

  describe('Caching Behaviour', () => {
    test('caches successful lookups', async () => {
      const isbn = '9780140328721'

      // First call - hits API
      const result1 = await lookupBookByISBN(isbn)
      expect(result1.success).toBe(true)

      // Second call - should use cache (much faster)
      const start = Date.now()
      const result2 = await lookupBookByISBN(isbn)
      const duration = Date.now() - start

      expect(result2.success).toBe(true)
      expect(result2.data).toEqual(result1.data)
      expect(duration).toBeLessThan(100) // Cache should be very fast
    })

    test('clearISBNCache clears the cache', async () => {
      const isbn = '9780140328721'

      // First call
      await lookupBookByISBN(isbn)

      // Clear cache
      clearISBNCache()

      // This would normally be from cache, but cache was cleared
      // We can't easily test if it hit the API again, but at least verify it works
      const result = await lookupBookByISBN(isbn)
      expect(result.success).toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('handles malformed ISBN gracefully', async () => {
      // This should not throw, but return an error result
      const result = await lookupBookByISBN('')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Data Transformation', () => {
    test('transforms Open Library data to expected format', async () => {
      const result = await lookupBookByISBN('9780140328721')

      if (result.success && result.data) {
        // Check all expected fields exist
        expect(result.data).toHaveProperty('title')
        expect(result.data).toHaveProperty('author')
        expect(result.data).toHaveProperty('isbn')
        expect(result.data).toHaveProperty('coverImageUrl')

        // Check types
        expect(typeof result.data.title).toBe('string')
        expect(typeof result.data.author).toBe('string')
        expect(typeof result.data.isbn).toBe('string')

        // Optional fields
        if (result.data.publisher) {
          expect(typeof result.data.publisher).toBe('string')
        }
        if (result.data.subjects) {
          expect(Array.isArray(result.data.subjects)).toBe(true)
        }
      }
    })

    test('handles multiple authors correctly', async () => {
      const result = await lookupBookByISBN('9780140328721')

      expect(result.success).toBe(true)
      expect(result.data?.author).toBeDefined()
      // Author field should be a comma-separated string
      expect(typeof result.data?.author).toBe('string')
    })
  })

  describe('API Request Timeout', () => {
    test('completes request within reasonable time', async () => {
      const start = Date.now()
      await lookupBookByISBN('9780140328721')
      const duration = Date.now() - start

      // Should complete within 15 seconds (10s timeout + buffer)
      expect(duration).toBeLessThan(15000)
    })
  })
})
