import { randomUUID } from 'node:crypto'

import { expect, test } from '../../src/fixtures/auth.fixture'
import { testData } from '../../src/helpers/test-data'

// Cat schema name (as registered in the example app)
const CAT_SCHEMA = 'Cat'

function notesFromContentPayload(fetched: Record<string, unknown>): string | undefined {
  if (typeof fetched.notes === 'string') return fetched.notes
  const data = fetched.data as { notes?: string } | undefined
  return typeof data?.notes === 'string' ? data.notes : undefined
}

test.describe('Security Hardening', () => {
  // ============================================================================
  // Rate Limiting (@nestjs/throttler on auth endpoints)
  // Run before RichText — long-running tests can reset the per-IP throttle window.
  // ============================================================================

  test.describe('Auth rate limiting', () => {
    test('POST /auth/login returns 429 after exceeding limit', async ({ request, apiBaseURL }) => {
      test.skip(
        ['1', 'true', 'yes'].includes(
          (process.env.MAGNET_E2E_DISABLE_AUTH_THROTTLE ?? '').toLowerCase(),
        ),
        'MAGNET_E2E_DISABLE_AUTH_THROTTLE set — use `bun run test:ci` to assert real 429s against an API without throttle bypass',
      )
      // Send 15 rapid login attempts with invalid credentials.
      // The limit is 10/min per IP — at least one in this batch must return 429.
      // Note: @nestjs/throttler tracks by client IP, not by email/user identity,
      // so randomizing emails does not affect whether 429 is triggered.
      const attempts = 15
      const responses: number[] = []

      for (let i = 0; i < attempts; i++) {
        const res = await request.post(`${apiBaseURL}/auth/login`, {
          data: {
            email: `ratelimit-${randomUUID()}@example.com`,
            password: 'InvalidPass123!',
          },
          headers: { 'Content-Type': 'application/json' },
        })
        responses.push(res.status())
      }

      // At least one response must be 429 (Too Many Requests)
      expect(responses).toContain(429)
    })

    test('429 response includes Retry-After header', async ({ request, apiBaseURL }) => {
      test.skip(
        ['1', 'true', 'yes'].includes(
          (process.env.MAGNET_E2E_DISABLE_AUTH_THROTTLE ?? '').toLowerCase(),
        ),
        'MAGNET_E2E_DISABLE_AUTH_THROTTLE set — use `bun run test:ci` to assert real 429s against an API without throttle bypass',
      )
      // Exhaust the rate limit (IP-based tracking) and capture the first 429
      let retryAfterHeader: string | null = null

      for (let i = 0; i < 20; i++) {
        const res = await request.post(`${apiBaseURL}/auth/login`, {
          data: {
            email: `retry-${randomUUID()}@example.com`,
            password: 'InvalidPass!',
          },
          headers: { 'Content-Type': 'application/json' },
        })
        if (res.status() === 429) {
          retryAfterHeader = res.headers()['retry-after'] ?? null
          break
        }
      }

      // We should have hit the rate limit
      expect(retryAfterHeader).not.toBeNull()
    })
  })

  // ============================================================================
  // Security Headers (helmet middleware)
  // ============================================================================

  test.describe('Security headers', () => {
    test('GET /health includes X-Content-Type-Options: nosniff', async ({
      request,
      apiBaseURL,
    }) => {
      const response = await request.get(`${apiBaseURL}/health`)
      expect(response.headers()['x-content-type-options']).toBe('nosniff')
    })

    test('GET /health includes X-Frame-Options header', async ({ request, apiBaseURL }) => {
      const response = await request.get(`${apiBaseURL}/health`)
      // helmet sets SAMEORIGIN by default
      expect(response.headers()['x-frame-options']).toBeDefined()
    })

    test('GET /health includes X-DNS-Prefetch-Control header', async ({ request, apiBaseURL }) => {
      const response = await request.get(`${apiBaseURL}/health`)
      expect(response.headers()['x-dns-prefetch-control']).toBeDefined()
    })
  })

  // ============================================================================
  // RichText Sanitization (via ContentService)
  // ============================================================================

  test.describe('RichText sanitization', () => {
    test('script tags are stripped from richtext fields on create', async ({
      authenticatedApiClient,
      cleanup,
    }) => {
      // Create an owner (required for Cat schema)
      const ownerData = testData.owner.create()
      const ownerRes = await authenticatedApiClient.createOwner(ownerData)
      expect(ownerRes.ok()).toBeTruthy()
      const owner = await ownerRes.json()
      const ownerId = (owner.id ?? owner._id) as string
      cleanup.register(() => authenticatedApiClient.deleteOwner(ownerId))

      // Create a Cat with richtext notes containing an XSS payload
      const catData = testData.cat.create({ owner: ownerId })
      const xssPayload = '<p>Hello <strong>world</strong></p><script>alert("xss")</script>'
      const res = await authenticatedApiClient.createContent(CAT_SCHEMA, {
        ...catData,
        notes: xssPayload,
      })
      expect(res.ok()).toBeTruthy()
      const doc = await res.json()
      const documentId = doc.documentId as string
      cleanup.trackContent(authenticatedApiClient, CAT_SCHEMA, documentId)

      // Retrieve the document and verify sanitization
      const getRes = await authenticatedApiClient.getContent(CAT_SCHEMA, documentId)
      expect(getRes.ok()).toBeTruthy()
      const fetched = (await getRes.json()) as Record<string, unknown>
      const notes = notesFromContentPayload(fetched)
      expect(notes).toBeDefined()

      expect(notes).not.toContain('<script>')
      expect(notes).not.toContain('alert')
      expect(notes).toContain('<p>Hello <strong>world</strong></p>')
    })

    test('safe HTML is preserved in richtext fields on create', async ({
      authenticatedApiClient,
      cleanup,
    }) => {
      const ownerData = testData.owner.create()
      const ownerRes = await authenticatedApiClient.createOwner(ownerData)
      expect(ownerRes.ok()).toBeTruthy()
      const owner = await ownerRes.json()
      const ownerId = (owner.id ?? owner._id) as string
      cleanup.register(() => authenticatedApiClient.deleteOwner(ownerId))

      const safeHtml = '<p>Hello <strong>world</strong></p><em>italic</em>'
      const catData = testData.cat.create({ owner: ownerId })
      const res = await authenticatedApiClient.createContent(CAT_SCHEMA, {
        ...catData,
        notes: safeHtml,
      })
      expect(res.ok()).toBeTruthy()
      const doc = await res.json()
      const documentId = doc.documentId as string
      cleanup.trackContent(authenticatedApiClient, CAT_SCHEMA, documentId)

      const getRes = await authenticatedApiClient.getContent(CAT_SCHEMA, documentId)
      expect(getRes.ok()).toBeTruthy()
      const fetched = (await getRes.json()) as Record<string, unknown>
      const notes = notesFromContentPayload(fetched)
      expect(notes).toBeDefined()

      expect(notes).toContain('<p>Hello <strong>world</strong></p>')
      expect(notes).toContain('<em>italic</em>')
    })

    test('javascript: href is stripped from anchor tags on create', async ({
      authenticatedApiClient,
      cleanup,
    }) => {
      const ownerData = testData.owner.create()
      const ownerRes = await authenticatedApiClient.createOwner(ownerData)
      expect(ownerRes.ok()).toBeTruthy()
      const owner = await ownerRes.json()
      const ownerId = (owner.id ?? owner._id) as string
      cleanup.register(() => authenticatedApiClient.deleteOwner(ownerId))

      const catData = testData.cat.create({ owner: ownerId })
      const res = await authenticatedApiClient.createContent(CAT_SCHEMA, {
        ...catData,
        notes: '<a href="javascript:alert(1)">click</a>',
      })
      expect(res.ok()).toBeTruthy()
      const doc = await res.json()
      const documentId = doc.documentId as string
      cleanup.trackContent(authenticatedApiClient, CAT_SCHEMA, documentId)

      const getRes = await authenticatedApiClient.getContent(CAT_SCHEMA, documentId)
      expect(getRes.ok()).toBeTruthy()
      const fetched = (await getRes.json()) as Record<string, unknown>
      const notes = notesFromContentPayload(fetched)
      expect(notes).toBeDefined()

      expect(notes).not.toContain('javascript:')
    })
  })
})
