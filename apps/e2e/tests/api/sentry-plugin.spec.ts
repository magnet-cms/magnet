import { expect, test } from '../../src/fixtures/base.fixture'
import { testData } from '../../src/helpers/test-data'

const _TEMPLATE_NAME = process.env.TEMPLATE_NAME || ''

/**
 * Sentry Plugin E2E Tests
 *
 * These tests verify the Sentry plugin's API endpoints integrate correctly
 * with a running Magnet CMS application. Only runs when the Sentry plugin
 * is registered AND a valid SENTRY_DSN is configured.
 */
test.describe('Sentry Plugin', () => {
  test.describe('GET /sentry/config — authentication required', () => {
    test('returns 401 when not authenticated', async ({ request, apiBaseURL }) => {
      const response = await request.get(`${apiBaseURL}/sentry/config`)
      // 404 = plugin not registered; 401 = plugin registered, auth required
      if (response.status() === 404) {
        test.skip(true, 'Sentry plugin not registered in test app')
        return
      }
      expect(response.status()).toBe(401)
    })
  })

  test.describe('GET /sentry/config — authenticated', () => {
    test.beforeEach(async ({ apiClient }) => {
      const status = await apiClient.getAuthStatus()

      if (status.requiresSetup) {
        const userData = testData.user.create()
        const auth = await apiClient.register(userData)
        apiClient.setToken(auth.access_token)
      } else {
        const userData = testData.user.create()
        try {
          const auth = await apiClient.register(userData)
          apiClient.setToken(auth.access_token)
        } catch {
          test.skip()
        }
      }
    })

    test('returns { dsn, enabled, environment } shape', async ({ apiClient }) => {
      const response = await apiClient.getSentryConfig()
      if (response.status() === 404) {
        test.skip(true, 'Sentry plugin not registered')
        return
      }
      expect(response.status()).toBe(200)

      const config = (await response.json()) as {
        dsn: string
        enabled: boolean
        environment: string
      }
      // When no SENTRY_DSN is set, config fields may be undefined
      if (config.dsn === undefined && config.enabled === undefined) {
        test.skip(true, 'Sentry not configured (no DSN)')
        return
      }
      expect(typeof config.dsn).toBe('string')
      expect(typeof config.enabled).toBe('boolean')
      expect(typeof config.environment).toBe('string')
    })

    test('enabled defaults to true', async ({ apiClient }) => {
      const response = await apiClient.getSentryConfig()
      if (response.status() === 404) {
        test.skip(true, 'Sentry plugin not registered')
        return
      }
      const config = (await response.json()) as { enabled: boolean }
      // Skip if Sentry isn't configured (no DSN → fields are undefined)
      if (config.enabled === undefined) {
        test.skip(true, 'Sentry not configured (no DSN)')
        return
      }
      expect(config.enabled).toBe(true)
    })
  })
})
