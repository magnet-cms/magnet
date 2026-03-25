import { expect, test } from '../../src/fixtures/base.fixture'

/**
 * Stripe Plugin API E2E Tests
 *
 * These tests verify the Stripe plugin endpoints are reachable.
 * They gracefully skip if the plugin is not registered in the test app.
 *
 * Prerequisites:
 * - Register StripePlugin in the test app's AppModule
 * - Set STRIPE_SECRET_KEY (test mode) and STRIPE_WEBHOOK_SECRET env vars
 * - Enable rawBody: true in NestFactory.create()
 */
test.describe('Stripe Plugin API', () => {
  test('GET /stripe/products — returns product list or 404 if plugin not registered', async ({
    request,
    apiBaseURL,
  }) => {
    const response = await request.get(`${apiBaseURL}/stripe/products`)

    if (response.status() === 404) {
      test.skip(true, 'Stripe plugin not registered in test app')
      return
    }

    expect(response.ok()).toBeTruthy()
    const products = await response.json()
    expect(Array.isArray(products)).toBeTruthy()
  })

  test('GET /stripe/access/:userId — returns no subscription for unknown user', async ({
    request,
    apiBaseURL,
  }) => {
    const response = await request.get(`${apiBaseURL}/stripe/access/nonexistent-user-id`)

    if (response.status() === 404) {
      test.skip(true, 'Stripe plugin not registered in test app')
      return
    }

    expect(response.ok()).toBeTruthy()
    const access = await response.json()
    expect(access.hasActiveSubscription).toBe(false)
    expect(access.plan).toBeNull()
    expect(access.features).toEqual([])
  })

  test('POST /stripe/webhooks — rejects requests without valid signature', async ({
    request,
    apiBaseURL,
  }) => {
    const response = await request.post(`${apiBaseURL}/stripe/webhooks`, {
      data: JSON.stringify({ type: 'test.event' }),
      headers: { 'Content-Type': 'application/json' },
    })

    if (response.status() === 404) {
      test.skip(true, 'Stripe plugin not registered in test app')
      return
    }

    // Should fail due to missing/invalid Stripe signature
    expect(response.ok()).toBeFalsy()
  })

  test('POST /stripe/checkout — rejects without required fields', async ({
    request,
    apiBaseURL,
  }) => {
    const response = await request.post(`${apiBaseURL}/stripe/checkout`, {
      data: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    if (response.status() === 404) {
      test.skip(true, 'Stripe plugin not registered in test app')
      return
    }

    // Should fail due to missing priceId/successUrl/cancelUrl
    expect(response.ok()).toBeFalsy()
  })
})
