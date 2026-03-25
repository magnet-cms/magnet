import 'reflect-metadata'
import { describe, expect, it } from 'vitest'

// Throttler metadata key constants (from @nestjs/throttler)
const THROTTLER_LIMIT = 'THROTTLER:LIMIT'
const THROTTLER_SKIP = 'THROTTLER:SKIP'

// Lazy imports to avoid triggering NestJS DI at module level
async function getAuthController() {
	const { AuthController } = await import('../auth.controller')
	return AuthController
}

async function getOAuthController() {
	const { OAuthController } = await import('../oauth.controller')
	return OAuthController
}

describe('Auth Rate Limiting decorators', () => {
	describe('AuthController', () => {
		it('should throttle login with limit 10', async () => {
			const AuthController = await getAuthController()
			const limit = Reflect.getMetadata(
				`${THROTTLER_LIMIT}default`,
				AuthController.prototype.login,
			)
			expect(limit).toBe(10)
		})

		it('should throttle register with limit 5', async () => {
			const AuthController = await getAuthController()
			const limit = Reflect.getMetadata(
				`${THROTTLER_LIMIT}default`,
				AuthController.prototype.register,
			)
			expect(limit).toBe(5)
		})

		it('should throttle forgotPassword with limit 3', async () => {
			const AuthController = await getAuthController()
			const limit = Reflect.getMetadata(
				`${THROTTLER_LIMIT}default`,
				AuthController.prototype.forgotPassword,
			)
			expect(limit).toBe(3)
		})

		it('should throttle resetPassword with limit 5', async () => {
			const AuthController = await getAuthController()
			const limit = Reflect.getMetadata(
				`${THROTTLER_LIMIT}default`,
				AuthController.prototype.resetPassword,
			)
			expect(limit).toBe(5)
		})

		it('should throttle refresh with limit 20', async () => {
			const AuthController = await getAuthController()
			const limit = Reflect.getMetadata(
				`${THROTTLER_LIMIT}default`,
				AuthController.prototype.refresh,
			)
			expect(limit).toBe(20)
		})

		it('should skip throttle on me endpoint', async () => {
			const AuthController = await getAuthController()
			const skip = Reflect.getMetadata(
				`${THROTTLER_SKIP}default`,
				AuthController.prototype.me,
			)
			expect(skip).toBe(true)
		})

		it('should skip throttle on status endpoint', async () => {
			const AuthController = await getAuthController()
			const skip = Reflect.getMetadata(
				`${THROTTLER_SKIP}default`,
				AuthController.prototype.status,
			)
			expect(skip).toBe(true)
		})

		it('should skip throttle on getSessions endpoint', async () => {
			const AuthController = await getAuthController()
			const skip = Reflect.getMetadata(
				`${THROTTLER_SKIP}default`,
				AuthController.prototype.getSessions,
			)
			expect(skip).toBe(true)
		})

		it('should skip throttle on updateProfile endpoint', async () => {
			const AuthController = await getAuthController()
			const skip = Reflect.getMetadata(
				`${THROTTLER_SKIP}default`,
				AuthController.prototype.updateProfile,
			)
			expect(skip).toBe(true)
		})
	})

	describe('OAuthController', () => {
		it('should throttle OAuth initiate with limit 10', async () => {
			const OAuthController = await getOAuthController()
			const limit = Reflect.getMetadata(
				`${THROTTLER_LIMIT}default`,
				OAuthController.prototype.initiate,
			)
			expect(limit).toBe(10)
		})

		it('should throttle OAuth callback with limit 10', async () => {
			const OAuthController = await getOAuthController()
			const limit = Reflect.getMetadata(
				`${THROTTLER_LIMIT}default`,
				OAuthController.prototype.callback,
			)
			expect(limit).toBe(10)
		})
	})
})
