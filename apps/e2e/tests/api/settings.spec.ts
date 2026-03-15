import { expect, test } from '../../src/fixtures/auth.fixture'

test.describe('Settings API', () => {
	test.describe('Read operations', () => {
		test('GET /settings returns all settings groups', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.getAllSettings()
			expect(response.ok()).toBeTruthy()

			const settings = await response.json()
			// Should return an array or object of settings groups
			expect(settings).toBeDefined()
		})

		test('GET /settings/auth returns auth settings group', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.getSettings('auth')
			expect(response.ok()).toBeTruthy()

			const settings = await response.json()
			// Settings may be returned as flat object {key: value} or array [{key, value}]
			const isArray = Array.isArray(settings)
			const isObject = typeof settings === 'object' && settings !== null
			expect(isArray || isObject).toBe(true)

			const keys = isArray
				? (settings as { key: string }[]).map((s) => s.key)
				: Object.keys(settings as Record<string, unknown>)
			expect(keys.length).toBeGreaterThan(0)
		})

		test('GET /settings/auth includes known auth setting keys', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.getSettings('auth')
			const settings = await response.json()

			const keys = Array.isArray(settings)
				? (settings as { key: string }[]).map((s) => s.key)
				: Object.keys(settings as Record<string, unknown>)
			// These keys come from AuthSettings schema
			expect(keys).toContain('minPasswordLength')
			expect(keys).toContain('requireUppercase')
			expect(keys).toContain('maxLoginAttempts')
		})

		test('GET /settings/auth/minPasswordLength returns a single setting', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.getSetting(
				'auth',
				'minPasswordLength',
			)
			expect(response.ok()).toBeTruthy()

			const setting = await response.json()
			expect(setting).toHaveProperty('key', 'minPasswordLength')
			expect(setting).toHaveProperty('value')
			expect(typeof setting.value).toBe('number')
		})

		test('GET /settings/:group/:key returns 404 for nonexistent key', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.getSetting(
				'auth',
				'nonExistentKey',
			)
			expect(response.status()).toBe(404)
		})
	})

	test.describe('Update operations', () => {
		test('PUT /settings/auth updates auth settings', async ({
			authenticatedApiClient,
		}) => {
			// Read current value first
			const getRes = await authenticatedApiClient.getSetting(
				'auth',
				'maxLoginAttempts',
			)
			const current = await getRes.json()
			const originalValue = current.value as number

			// Update to a new value
			const newValue = originalValue === 5 ? 10 : 5
			const updateRes = await authenticatedApiClient.updateSettings('auth', {
				maxLoginAttempts: newValue,
			})
			expect(updateRes.ok()).toBeTruthy()

			// Verify the change persisted
			const verifyRes = await authenticatedApiClient.getSetting(
				'auth',
				'maxLoginAttempts',
			)
			const verified = await verifyRes.json()
			expect(verified.value).toBe(newValue)

			// Restore original value
			await authenticatedApiClient.updateSettings('auth', {
				maxLoginAttempts: originalValue,
			})
		})

		test('PUT /settings/:group/:key updates a single setting', async ({
			authenticatedApiClient,
		}) => {
			const getRes = await authenticatedApiClient.getSetting(
				'auth',
				'lockoutDuration',
			)
			const current = await getRes.json()
			const originalValue = current.value as number

			const newValue = originalValue === 15 ? 30 : 15
			const updateRes = await authenticatedApiClient.updateSetting(
				'auth',
				'lockoutDuration',
				newValue,
			)
			expect(updateRes.ok()).toBeTruthy()

			const verifyRes = await authenticatedApiClient.getSetting(
				'auth',
				'lockoutDuration',
			)
			const verified = await verifyRes.json()
			expect(verified.value).toBe(newValue)

			// Restore original value
			await authenticatedApiClient.updateSetting(
				'auth',
				'lockoutDuration',
				originalValue,
			)
		})
	})

	test.describe('Default values', () => {
		test('auth settings have correct default values after initialization', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.getSettings('auth')
			const settings = await response.json()

			// Settings may be returned as flat object {key: value} or array [{key, value}]
			const byKey = Array.isArray(settings)
				? Object.fromEntries(
						(settings as { key: string; value: unknown }[]).map((s) => [
							s.key,
							s.value,
						]),
					)
				: (settings as Record<string, unknown>)

			// Verify defaults from AuthSettings schema
			expect(byKey.sessionDuration).toBe(24)
			expect(byKey.refreshTokenDuration).toBe(7)
			expect(byKey.enableSessions).toBe(true)
			expect(byKey.minPasswordLength).toBe(8)
			expect(byKey.requireUppercase).toBe(true)
			expect(byKey.requireNumber).toBe(true)
			expect(byKey.requireSpecialChar).toBe(false)
			expect(byKey.maxLoginAttempts).toBe(5)
			expect(byKey.lockoutDuration).toBe(15)
			expect(byKey.allowRegistration).toBe(false)
			expect(byKey.requireEmailVerification).toBe(false)
		})
	})
})
