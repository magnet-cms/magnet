import { expect, test } from '../../src/fixtures/base.fixture'

const TEMPLATE_NAME = process.env.TEMPLATE_NAME || ''

test.describe('Auth Settings Awareness', () => {
  test('GET /auth/status returns authStrategy field', async ({ apiClient }) => {
    const status = await apiClient.getAuthStatus()

    expect(status).toHaveProperty('authStrategy')
    expect(typeof status.authStrategy).toBe('string')
    // Template-specific: mongoose and drizzle-neon use JWT; drizzle-supabase uses supabase
    if (TEMPLATE_NAME === 'drizzle-supabase') {
      expect(status.authStrategy).toBe('supabase')
    } else {
      expect(status.authStrategy).toBe('jwt')
    }
  })

  test('GET /auth/status does not return externalAuthInfo for JWT strategy', async ({
    apiClient,
  }) => {
    test.skip(TEMPLATE_NAME === 'drizzle-supabase', 'Supabase has externalAuthInfo')

    const status = await apiClient.getAuthStatus()

    // Built-in JWT strategy should not have externalAuthInfo
    expect(status.authStrategy).toBe('jwt')
    expect(status.externalAuthInfo).toBeUndefined()
  })

  test('GET /auth/status still returns providers field', async ({ apiClient }) => {
    const status = await apiClient.getAuthStatus()

    // The existing providers field (for login-page OAuth buttons) should still be present
    expect(status).toHaveProperty('providers')
    expect(Array.isArray(status.providers)).toBe(true)
  })
})
