import { expect, test } from '../../src/fixtures/base.fixture'
import { testData } from '../../src/helpers/test-data'

test.describe('Auth API', () => {
  test('GET /auth/status returns authentication status', async ({ apiClient }) => {
    const status = await apiClient.getAuthStatus()

    expect(status).toHaveProperty('authenticated')
    expect(typeof status.authenticated).toBe('boolean')
  })

  test('POST /auth/login responds within 5000ms', async ({ apiClient, request, apiBaseURL }) => {
    // Register a fresh user to guarantee valid credentials
    const { randomUUID } = await import('node:crypto')
    const email = `timing-${randomUUID().slice(0, 8)}@example.com`
    const password = 'TestPassword123!'

    const status = await apiClient.getAuthStatus()
    if (status.requiresSetup) {
      // Cannot perform login-timing test without an existing user; skip gracefully
      test.skip(true, 'Setup required — cannot test login timing')
      return
    }

    await request
      .post(`${apiBaseURL}/auth/register`, {
        data: { email, password, name: 'Timing User', role: 'admin' },
      })
      .catch(() => {})

    const start = Date.now()
    const response = await request.post(`${apiBaseURL}/auth/login`, {
      data: { email, password },
      headers: { 'Content-Type': 'application/json' },
    })
    const elapsed = Date.now() - start

    // Login should complete within 5 seconds even if credentials fail (lenient for CI/slow envs)
    expect(elapsed).toBeLessThan(5000)
    // Either succeeds (200/201) or rejects (401) — both are valid timing test outcomes
    expect([200, 201, 401]).toContain(response.status())
  })

  test('POST /auth/register creates a new user', async ({ apiClient }) => {
    const status = await apiClient.getAuthStatus()
    test.skip(status.requiresSetup !== true, 'Users already exist, registration may be restricted')

    const userData = testData.user.create()
    const response = await apiClient.register(userData)

    expect(response.access_token).toBeDefined()
  })

  test('GET /auth/me returns current user when authenticated', async ({ apiClient }) => {
    const status = await apiClient.getAuthStatus()
    test.skip(status.requiresSetup === true, 'Setup required first')

    const userData = testData.user.create()
    const auth = await apiClient.register(userData)

    apiClient.setToken(auth.access_token)

    const response = await apiClient.getMe()
    expect(response.ok()).toBeTruthy()

    const user = await response.json()
    expect(user.email).toBe(userData.email)
  })

  test('GET /auth/me returns 401 when not authenticated', async ({ request, apiBaseURL }) => {
    const response = await request.get(`${apiBaseURL}/auth/me`)

    expect(response.status()).toBe(401)
  })

  test('GET /auth/status returns onboardingCompleted for authenticated user', async ({
    apiClient,
  }) => {
    const status = await apiClient.getAuthStatus()
    test.skip(status.requiresSetup === true, 'Setup required first')

    const userData = testData.user.create()
    const auth = await apiClient.register(userData)
    apiClient.setToken(auth.access_token)

    const authStatus = await apiClient.getAuthStatus()
    expect(authStatus.authenticated).toBe(true)
    expect(typeof authStatus.onboardingCompleted).toBe('boolean')
  })

  test('first registered user gets admin role automatically', async ({ apiClient }) => {
    const status = await apiClient.getAuthStatus()
    test.skip(
      status.requiresSetup !== true,
      'Users already exist — first-user test only runs on fresh database',
    )

    // Register with a non-admin role to verify backend overrides it
    const userData = testData.user.create({ role: 'authenticated' })
    const auth = await apiClient.register(userData)

    apiClient.setToken(auth.access_token)

    const response = await apiClient.getMe()
    expect(response.ok()).toBeTruthy()

    const user = await response.json()
    expect(user.role).toBe('admin')
  })
})
