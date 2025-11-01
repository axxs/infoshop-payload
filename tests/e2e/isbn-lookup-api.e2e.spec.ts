/**
 * E2E tests for ISBN Lookup API endpoint
 * Tests the API endpoint through HTTP requests
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
const API_ENDPOINT = '/api/books/lookup-isbn'

test.describe('ISBN Lookup API E2E', () => {
  test.describe('GET /api/books/lookup-isbn - Success Cases', () => {
    test('returns book data for valid ISBN-13', async ({ request }) => {
      const response = await request.get(`${BASE_URL}${API_ENDPOINT}?isbn=9780140328721`)

      expect(response.ok()).toBeTruthy()
      expect(response.status()).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.source).toBe('openlibrary')
      expect(data.data).toBeDefined()
      expect(data.data.title).toBe('Fantastic Mr. Fox')
      expect(data.data.author).toContain('Roald Dahl')
      expect(data.data.isbn).toBe('9780140328721')
      expect(data.data.coverImageUrl).toBeDefined()

      // Verify ISBN validation info
      expect(data.isbn).toBeDefined()
      expect(data.isbn.provided).toBe('9780140328721')
      expect(data.isbn.validated).toBe('9780140328721')
      expect(data.isbn.type).toBe('ISBN-13')
    })

    test('returns book data for valid ISBN-10', async ({ request }) => {
      const response = await request.get(`${BASE_URL}${API_ENDPOINT}?isbn=0141032871`)

      expect(response.ok()).toBeTruthy()
      expect(response.status()).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.title).toBeDefined()
      expect(data.data.author).toBeDefined()

      // Verify ISBN type detection
      expect(data.isbn.type).toBe('ISBN-10')
    })

    test('accepts ISBN with hyphens', async ({ request }) => {
      const response = await request.get(`${BASE_URL}${API_ENDPOINT}?isbn=978-0-14-032872-1`)

      expect(response.ok()).toBeTruthy()
      expect(response.status()).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.title).toBe('Fantastic Mr. Fox')
      expect(data.isbn.validated).toBe('9780140328721') // Hyphens removed
    })

    test('includes all expected fields in response', async ({ request }) => {
      const response = await request.get(`${BASE_URL}${API_ENDPOINT}?isbn=9780140328721`)

      const data = await response.json()
      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('data')
      expect(data).toHaveProperty('source')
      expect(data).toHaveProperty('isbn')

      expect(data.data).toHaveProperty('title')
      expect(data.data).toHaveProperty('author')
      expect(data.data).toHaveProperty('isbn')
      expect(data.data).toHaveProperty('coverImageUrl')
      expect(data.data).toHaveProperty('publisher')
      expect(data.data).toHaveProperty('publishedDate')
      expect(data.data).toHaveProperty('subjects')
    })
  })

  test.describe('GET /api/books/lookup-isbn - Error Cases', () => {
    test('returns 400 for missing ISBN parameter', async ({ request }) => {
      const response = await request.get(`${BASE_URL}${API_ENDPOINT}`)

      expect(response.status()).toBe(400)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('ISBN parameter is required')
    })

    test('returns 400 for invalid ISBN checksum', async ({ request }) => {
      const response = await request.get(`${BASE_URL}${API_ENDPOINT}?isbn=9780140328720`)

      expect(response.status()).toBe(400)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid ISBN-13 checksum')
      expect(data.details).toBeDefined()
      expect(data.details.provided).toBe('9780140328720')
    })

    test('returns 400 for invalid ISBN length', async ({ request }) => {
      const response = await request.get(`${BASE_URL}${API_ENDPOINT}?isbn=12345`)

      expect(response.status()).toBe(400)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid ISBN length')
    })

    test('returns 404 for non-existent ISBN', async ({ request }) => {
      const response = await request.get(`${BASE_URL}${API_ENDPOINT}?isbn=9999999999999`)

      expect(response.status()).toBe(404)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.source).toBe('openlibrary')
    })
  })

  test.describe('Response Headers and Performance', () => {
    test('returns JSON content type', async ({ request }) => {
      const response = await request.get(`${BASE_URL}${API_ENDPOINT}?isbn=9780140328721`)

      const contentType = response.headers()['content-type']
      expect(contentType).toContain('application/json')
    })

    test('responds within reasonable time', async ({ request }) => {
      const start = Date.now()
      await request.get(`${BASE_URL}${API_ENDPOINT}?isbn=9780140328721`)
      const duration = Date.now() - start

      // Should respond within 15 seconds (including Open Library API call + 10s timeout)
      expect(duration).toBeLessThan(15000)
    })

    test('cached requests are much faster', async ({ request }) => {
      // First request (hits API)
      await request.get(`${BASE_URL}${API_ENDPOINT}?isbn=9780140328721`)

      // Second request (from cache)
      const start = Date.now()
      const response = await request.get(`${BASE_URL}${API_ENDPOINT}?isbn=9780140328721`)
      const duration = Date.now() - start

      expect(response.ok()).toBeTruthy()
      // Cached response should be very fast
      expect(duration).toBeLessThan(1000)
    })
  })

  test.describe('Real World ISBN Tests', () => {
    test('handles Harry Potter ISBN with X check digit', async ({ request }) => {
      const response = await request.get(`${BASE_URL}${API_ENDPOINT}?isbn=043942089X`)

      expect(response.ok()).toBeTruthy()
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.isbn.type).toBe('ISBN-10')
    })

    test('handles ISBN with spaces', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}${API_ENDPOINT}?isbn=${encodeURIComponent('978 0 14 032872 1')}`,
      )

      expect(response.ok()).toBeTruthy()
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.isbn.validated).toBe('9780140328721')
    })
  })

  test.describe('Error Response Structure', () => {
    test('validation errors include details', async ({ request }) => {
      const response = await request.get(`${BASE_URL}${API_ENDPOINT}?isbn=invalid`)

      expect(response.status()).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('details')
      expect(data.details).toHaveProperty('provided')
      expect(data.details).toHaveProperty('cleaned')
    })

    test('not found errors include source', async ({ request }) => {
      const response = await request.get(`${BASE_URL}${API_ENDPOINT}?isbn=9999999999999`)

      expect(response.status()).toBe(404)

      const data = await response.json()
      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('source')
      expect(data.source).toBe('openlibrary')
    })
  })
})
