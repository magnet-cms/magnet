import { expect, test } from '../../src/fixtures/base.fixture'

/**
 * OAuth provider API tests.
 *
 * These tests verify the API contracts around OAuth provider configuration
 * and discovery. Actual OAuth redirects require a running provider and
 * browser interaction, so we verify:
 *  - GET /auth/status includes a `providers` array
 *  - When no providers are configured, `providers` is empty or absent
 *  - GET /auth/oauth/providers returns the same provider list
 */
test.describe('OAuth Providers API', () => {
	test('GET /auth/status returns a providers field', async ({ apiClient }) => {
		const status = await apiClient.getAuthStatus()

		// providers is always present (may be empty)
		expect(status).toHaveProperty('providers')
		expect(Array.isArray(status.providers)).toBe(true)
	})

	test('GET /auth/status providers only contains known provider names', async ({
		apiClient,
	}) => {
		const status = await apiClient.getAuthStatus()
		const knownProviders = ['google', 'github']

		for (const provider of status.providers ?? []) {
			expect(knownProviders).toContain(provider)
		}
	})

	test('GET /auth/oauth/providers returns the same provider list', async ({
		request,
		apiBaseURL,
	}) => {
		const statusRes = await request.get(`${apiBaseURL}/auth/status`)
		const status = await statusRes.json()

		const providersRes = await request.get(`${apiBaseURL}/auth/oauth/providers`)
		expect(providersRes.ok()).toBeTruthy()

		const providersData = await providersRes.json()
		expect(providersData).toHaveProperty('providers')
		expect(Array.isArray(providersData.providers)).toBe(true)

		// Both endpoints should agree on which providers are available
		expect(providersData.providers).toEqual(status.providers ?? [])
	})

	test('GET /auth/oauth/:provider redirects to provider (302) when configured', async ({
		request,
		apiBaseURL,
		apiClient,
	}) => {
		const status = await apiClient.getAuthStatus()
		const providers = status.providers ?? []

		if (providers.length === 0) {
			test.skip(true, 'No OAuth providers configured — skipping redirect test')
			return
		}

		for (const provider of providers) {
			const response = await request.get(
				`${apiBaseURL}/auth/oauth/${provider}`,
				{
					// Don't follow redirects so we can inspect the 302
					maxRedirects: 0,
				},
			)

			// Passport should issue a 302 redirect to the provider's consent page
			expect([301, 302]).toContain(response.status())

			const location = response.headers().location
			expect(typeof location).toBe('string')
			expect(location.length).toBeGreaterThan(0)
		}
	})

	test('GET /auth/oauth/:provider returns 401 when provider not configured', async ({
		request,
		apiBaseURL,
	}) => {
		// 'nonexistent' is never a real configured provider
		const response = await request.get(`${apiBaseURL}/auth/oauth/nonexistent`, {
			maxRedirects: 0,
		})

		// Either 401 (no strategy) or 404 (no route) is acceptable
		expect([401, 404]).toContain(response.status())
	})
})
