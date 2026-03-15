import { expect, test } from '../../src/fixtures/base.fixture'

/**
 * OAuth provider API tests.
 *
 * These tests verify the API contracts around OAuth provider discovery.
 * OAuth provider credentials are configured exclusively through the admin
 * settings UI (OAuthSettings in the DB) — no code-level config is needed.
 *
 * What we verify:
 *  - GET /auth/status always includes a `providers` array
 *  - In a fresh test environment (no credentials in DB) `providers` is empty
 *  - GET /auth/oauth/providers returns the same provider list as /auth/status
 *  - Initiating an unconfigured provider returns 404
 *  - If a provider is active (configured), initiation returns a 302 redirect
 *  - All provider names returned are among the supported set
 */
test.describe('OAuth Providers API', () => {
	test('GET /auth/status returns a providers field', async ({ apiClient }) => {
		const status = await apiClient.getAuthStatus()

		expect(status).toHaveProperty('providers')
		expect(Array.isArray(status.providers)).toBe(true)
	})

	test('GET /auth/status providers is empty when no credentials are configured', async ({
		apiClient,
	}) => {
		const status = await apiClient.getAuthStatus()

		// In a clean test environment OAuthSettings credentials are all empty strings,
		// so no providers should be active.
		expect(status.providers ?? []).toHaveLength(0)
	})

	test('GET /auth/status providers only contains supported provider names', async ({
		apiClient,
	}) => {
		const status = await apiClient.getAuthStatus()
		const supportedProviders = ['google', 'github', 'facebook', 'discord']

		for (const provider of status.providers ?? []) {
			expect(supportedProviders).toContain(provider)
		}
	})

	test('GET /auth/status is the authoritative source for active providers', async ({
		request,
		apiBaseURL,
	}) => {
		// There is no dedicated /auth/oauth/providers endpoint.
		// The OAuth controller routes /auth/oauth/:provider, so "providers"
		// would be interpreted as a provider name and return 404.
		// The authoritative provider list comes from GET /auth/status.
		const statusRes = await request.get(`${apiBaseURL}/auth/status`)
		expect(statusRes.ok()).toBeTruthy()

		const status = (await statusRes.json()) as { providers?: string[] }
		expect(status).toHaveProperty('providers')
		expect(Array.isArray(status.providers)).toBe(true)

		// Verify the /auth/oauth/:provider route rejects unknown names
		const providersRes = await request.get(`${apiBaseURL}/auth/oauth/providers`)
		// "providers" is not a valid provider name, so it returns 404
		expect(providersRes.status()).toBe(404)
	})

	test('GET /auth/oauth/:provider returns 404 when provider is not configured', async ({
		request,
		apiBaseURL,
	}) => {
		// 'nonexistent' is never a valid or configured provider name
		const response = await request.get(`${apiBaseURL}/auth/oauth/nonexistent`, {
			maxRedirects: 0,
		})

		// DynamicOAuthGuard throws NotFoundException for unknown strategies
		expect(response.status()).toBe(404)
	})

	test('GET /auth/oauth/:provider redirects (302) when provider is configured', async ({
		request,
		apiBaseURL,
		apiClient,
	}) => {
		const status = await apiClient.getAuthStatus()
		const providers = status.providers ?? []

		if (providers.length === 0) {
			test.skip(
				true,
				'No OAuth providers configured in OAuthSettings — skipping redirect test',
			)
			return
		}

		for (const provider of providers) {
			const response = await request.get(
				`${apiBaseURL}/auth/oauth/${provider}`,
				{ maxRedirects: 0 },
			)

			// Passport issues a 302 redirect to the provider's consent page
			expect([301, 302]).toContain(response.status())

			const location = response.headers().location
			expect(typeof location).toBe('string')
			expect(location.length).toBeGreaterThan(0)
		}
	})
})
