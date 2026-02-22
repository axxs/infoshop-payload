/**
 * Route Authorization Tests
 *
 * Verifies that all admin-only API routes:
 * 1. Return 401 for unauthenticated requests
 * 2. Return 403 for authenticated customers (insufficient role)
 * 3. Allow admin and volunteer roles
 *
 * Tests the requireRole() helper used across all API routes.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('@payload-config', () => ({ default: {} }))

// Mock next/server to provide a working NextResponse
vi.mock('next/server', () => {
  class MockNextResponse {
    body: string
    status: number
    headers: Map<string, string>

    constructor(body: string | null, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body || ''
      this.status = init?.status || 200
      this.headers = new Map(Object.entries(init?.headers || {}))
    }

    async json() {
      return JSON.parse(this.body)
    }

    static json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      return new MockNextResponse(JSON.stringify(data), init)
    }
  }

  return { NextResponse: MockNextResponse }
})

import { requireRole } from '@/lib/access'

/** Creates a mock Payload instance with configurable auth behavior */
function createMockPayload(user: { id: number; role: string } | null) {
  return {
    auth: vi.fn().mockResolvedValue({ user }),
  }
}

describe('requireRole - Authentication (401)', () => {
  test('returns 401 when no user is authenticated', async () => {
    const payload = createMockPayload(null)
    const headers = new Headers()

    const result = await requireRole(payload as never, headers, ['admin', 'volunteer'])

    expect(result.authorized).toBe(false)
    if (!result.authorized) {
      const body = await result.response.json()
      expect(result.response.status).toBe(401)
      expect(body.error).toBe('Unauthorized')
    }
  })

  test('passes request headers to payload.auth()', async () => {
    const payload = createMockPayload(null)
    const headers = new Headers({ Authorization: 'Bearer test-token' })

    await requireRole(payload as never, headers, ['admin'])

    expect(payload.auth).toHaveBeenCalledWith({ headers })
  })
})

describe('requireRole - Authorization (403)', () => {
  test('returns 403 when customer tries admin-only route', async () => {
    const payload = createMockPayload({ id: 1, role: 'customer' })
    const headers = new Headers()

    const result = await requireRole(payload as never, headers, ['admin', 'volunteer'])

    expect(result.authorized).toBe(false)
    if (!result.authorized) {
      const body = await result.response.json()
      expect(result.response.status).toBe(403)
      expect(body.error).toContain('Forbidden')
    }
  })

  test('returns 403 when volunteer tries admin-only route', async () => {
    const payload = createMockPayload({ id: 2, role: 'volunteer' })
    const headers = new Headers()

    const result = await requireRole(payload as never, headers, ['admin'])

    expect(result.authorized).toBe(false)
    if (!result.authorized) {
      const body = await result.response.json()
      expect(result.response.status).toBe(403)
      expect(body.error).toContain('Forbidden')
    }
  })

  test('returns 403 for user with no role (defaults to customer)', async () => {
    const payload = createMockPayload({ id: 3, role: '' } as never)
    const headers = new Headers()

    const result = await requireRole(payload as never, headers, ['admin', 'volunteer'])

    expect(result.authorized).toBe(false)
    if (!result.authorized) {
      expect(result.response.status).toBe(403)
    }
  })
})

describe('requireRole - Successful Authorization', () => {
  test('allows admin for admin-only routes', async () => {
    const payload = createMockPayload({ id: 1, role: 'admin' })
    const headers = new Headers()

    const result = await requireRole(payload as never, headers, ['admin'])

    expect(result.authorized).toBe(true)
    if (result.authorized) {
      expect(result.user.id).toBe(1)
    }
  })

  test('allows volunteer for admin/volunteer routes', async () => {
    const payload = createMockPayload({ id: 2, role: 'volunteer' })
    const headers = new Headers()

    const result = await requireRole(payload as never, headers, ['admin', 'volunteer'])

    expect(result.authorized).toBe(true)
    if (result.authorized) {
      expect(result.user.id).toBe(2)
    }
  })

  test('allows admin for admin/volunteer routes', async () => {
    const payload = createMockPayload({ id: 1, role: 'admin' })
    const headers = new Headers()

    const result = await requireRole(payload as never, headers, ['admin', 'volunteer'])

    expect(result.authorized).toBe(true)
  })

  test('allows customer for routes that include customer role', async () => {
    const payload = createMockPayload({ id: 5, role: 'customer' })
    const headers = new Headers()

    const result = await requireRole(payload as never, headers, ['admin', 'volunteer', 'customer'])

    expect(result.authorized).toBe(true)
    if (result.authorized) {
      expect(result.user.id).toBe(5)
    }
  })
})

describe('Route Authorization Matrix', () => {
  const adminRouteRoles: Array<'admin' | 'volunteer'> = ['admin', 'volunteer']
  const allRoles: Array<'admin' | 'volunteer' | 'customer'> = ['admin', 'volunteer', 'customer']

  interface RouteSpec {
    name: string
    roles: Array<'admin' | 'volunteer' | 'customer'>
    allowedRoles: string[]
    deniedRoles: string[]
  }

  const routes: RouteSpec[] = [
    {
      name: 'CSV Import Execute (/api/books/csv-import/execute)',
      roles: adminRouteRoles,
      allowedRoles: ['admin', 'volunteer'],
      deniedRoles: ['customer'],
    },
    {
      name: 'CSV Import Preview (/api/books/csv-import/preview)',
      roles: adminRouteRoles,
      allowedRoles: ['admin', 'volunteer'],
      deniedRoles: ['customer'],
    },
    {
      name: 'CSV Error Report (/api/books/csv-import/error-report)',
      roles: adminRouteRoles,
      allowedRoles: ['admin', 'volunteer'],
      deniedRoles: ['customer'],
    },
    {
      name: 'CSV Template (/api/books/csv-import/template)',
      roles: adminRouteRoles,
      allowedRoles: ['admin', 'volunteer'],
      deniedRoles: ['customer'],
    },
    {
      name: 'Books Export (/api/books/export)',
      roles: adminRouteRoles,
      allowedRoles: ['admin', 'volunteer'],
      deniedRoles: ['customer'],
    },
    {
      name: 'Books JSON Import (/api/books/import)',
      roles: adminRouteRoles,
      allowedRoles: ['admin', 'volunteer'],
      deniedRoles: ['customer'],
    },
    {
      name: 'ISBN Lookup (/api/books/lookup-isbn)',
      roles: adminRouteRoles,
      allowedRoles: ['admin', 'volunteer'],
      deniedRoles: ['customer'],
    },
    {
      name: 'Refresh Covers (/api/books/refresh-covers)',
      roles: adminRouteRoles,
      allowedRoles: ['admin', 'volunteer'],
      deniedRoles: ['customer'],
    },
    {
      name: 'Square Payments (/api/square/payments)',
      roles: allRoles,
      allowedRoles: ['admin', 'volunteer', 'customer'],
      deniedRoles: [],
    },
  ]

  for (const route of routes) {
    describe(route.name, () => {
      test('rejects unauthenticated request with 401', async () => {
        const payload = createMockPayload(null)
        const result = await requireRole(payload as never, new Headers(), route.roles)
        expect(result.authorized).toBe(false)
        if (!result.authorized) {
          expect(result.response.status).toBe(401)
        }
      })

      for (const role of route.allowedRoles) {
        test(`allows ${role} role`, async () => {
          const payload = createMockPayload({ id: 1, role })
          const result = await requireRole(payload as never, new Headers(), route.roles)
          expect(result.authorized).toBe(true)
        })
      }

      for (const role of route.deniedRoles) {
        test(`denies ${role} role with 403`, async () => {
          const payload = createMockPayload({ id: 1, role })
          const result = await requireRole(payload as never, new Headers(), route.roles)
          expect(result.authorized).toBe(false)
          if (!result.authorized) {
            expect(result.response.status).toBe(403)
          }
        })
      }
    })
  }
})
