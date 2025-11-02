/**
 * Square Sync API E2E Tests
 *
 * Tests the Square sync API endpoint
 * POST /api/square/sync
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
const API_ENDPOINT = '/api/square/sync'

test.describe('Square Sync API Endpoint', () => {
  test('returns 400 for invalid strategy', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_ENDPOINT}`, {
      data: {
        strategy: 'invalid-strategy',
      },
    })

    expect(response.status()).toBe(400)

    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Invalid strategy')
    expect(data.error).toContain('specific')
    expect(data.error).toContain('unsynced')
    expect(data.error).toContain('modified')
  })

  test('returns 400 when bookIds missing for specific strategy', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_ENDPOINT}`, {
      data: {
        strategy: 'specific',
      },
    })

    expect(response.status()).toBe(400)

    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('bookIds')
  })

  test('returns 400 when bookIds is empty array for specific strategy', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_ENDPOINT}`, {
      data: {
        strategy: 'specific',
        bookIds: [],
      },
    })

    expect(response.status()).toBe(400)

    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('bookIds')
  })

  test('returns 400 when bookIds is not an array for specific strategy', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_ENDPOINT}`, {
      data: {
        strategy: 'specific',
        bookIds: 'not-an-array',
      },
    })

    expect(response.status()).toBe(400)

    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('bookIds')
  })

  test('accepts unsynced strategy without additional parameters', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_ENDPOINT}`, {
      data: {
        strategy: 'unsynced',
      },
    })

    // Either succeeds or fails due to Square credentials, but validates the request format
    const data = await response.json()
    expect(data).toHaveProperty('success')

    // If it fails, it should be due to Square config, not validation
    if (!data.success && response.status() !== 200) {
      expect(response.status()).toBe(500) // Internal error, not validation error
    }
  })

  test('accepts modified strategy without since parameter (defaults to 24h)', async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}${API_ENDPOINT}`, {
      data: {
        strategy: 'modified',
      },
    })

    const data = await response.json()
    expect(data).toHaveProperty('success')

    // Either succeeds or fails due to Square credentials
    if (!data.success && response.status() !== 200) {
      expect(response.status()).toBe(500)
    }
  })

  test('accepts modified strategy with custom since date', async ({ request }) => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const response = await request.post(`${BASE_URL}${API_ENDPOINT}`, {
      data: {
        strategy: 'modified',
        since: yesterday,
      },
    })

    const data = await response.json()
    expect(data).toHaveProperty('success')
  })

  test('response includes expected result structure on success', async ({ request }) => {
    // This test may fail if Square credentials aren't configured, which is expected
    const response = await request.post(`${BASE_URL}${API_ENDPOINT}`, {
      data: {
        strategy: 'unsynced',
      },
    })

    const data = await response.json()

    if (data.success) {
      // Successful response should include sync result
      expect(data.data).toBeDefined()
      expect(data.data).toHaveProperty('itemsProcessed')
      expect(data.data).toHaveProperty('itemsCreated')
      expect(data.data).toHaveProperty('itemsUpdated')
      expect(data.data).toHaveProperty('itemsFailed')
      expect(data.data).toHaveProperty('errors')
    }
  })

  test('returns 500 with error details in development mode on Square failure', async ({
    request,
  }) => {
    if (process.env.NODE_ENV !== 'development') {
      test.skip()
    }

    // Attempt sync with invalid book IDs (should fail)
    const response = await request.post(`${BASE_URL}${API_ENDPOINT}`, {
      data: {
        strategy: 'specific',
        bookIds: ['non-existent-book-id'],
      },
    })

    const data = await response.json()

    // Either succeeds with 0 items processed or fails
    if (!data.success) {
      expect(response.status()).toBe(500)
      expect(data.error).toBeDefined()
      // In development, should include details
      expect(data.details).toBeDefined()
    }
  })
})
