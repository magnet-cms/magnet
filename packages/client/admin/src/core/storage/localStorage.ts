import type { TokenStorage } from '../adapters/types'

export interface LocalStorageOptions {
	/**
	 * Prefix for storage keys (default: 'magnet_auth')
	 */
	prefix?: string
}

/**
 * Creates a localStorage-based token storage
 * This is the default storage for browser-based SPAs
 */
export function createLocalStorage(
	options?: LocalStorageOptions,
): TokenStorage {
	const prefix = options?.prefix || 'magnet_auth'
	const tokenKey = `${prefix}_token`
	const refreshTokenKey = `${prefix}_refresh_token`
	const expiryKey = `${prefix}_token_expiry`

	return {
		getAccessToken(): string | null {
			if (typeof window === 'undefined') return null
			return localStorage.getItem(tokenKey)
		},

		setAccessToken(token: string): void {
			if (typeof window === 'undefined') return
			localStorage.setItem(tokenKey, token)
		},

		getRefreshToken(): string | null {
			if (typeof window === 'undefined') return null
			return localStorage.getItem(refreshTokenKey)
		},

		setRefreshToken(token: string): void {
			if (typeof window === 'undefined') return
			localStorage.setItem(refreshTokenKey, token)
		},

		getTokenExpiry(): number | null {
			if (typeof window === 'undefined') return null
			const expiry = localStorage.getItem(expiryKey)
			return expiry ? Number.parseInt(expiry, 10) : null
		},

		setTokenExpiry(expiry: number): void {
			if (typeof window === 'undefined') return
			localStorage.setItem(expiryKey, expiry.toString())
		},

		clearAll(): void {
			if (typeof window === 'undefined') return
			localStorage.removeItem(tokenKey)
			localStorage.removeItem(refreshTokenKey)
			localStorage.removeItem(expiryKey)
		},
	}
}

// Legacy key names for backward compatibility with existing apps
export const LEGACY_TOKEN_KEY = 'auth_token'
export const LEGACY_REFRESH_TOKEN_KEY = 'auth_refresh_token'
export const LEGACY_TOKEN_EXPIRY_KEY = 'auth_token_expiry'

/**
 * Creates a localStorage storage with legacy key names
 * Use this for backward compatibility with existing Magnet apps
 */
export function createLegacyLocalStorage(): TokenStorage {
	return {
		getAccessToken(): string | null {
			if (typeof window === 'undefined') return null
			return localStorage.getItem(LEGACY_TOKEN_KEY)
		},

		setAccessToken(token: string): void {
			if (typeof window === 'undefined') return
			localStorage.setItem(LEGACY_TOKEN_KEY, token)
		},

		getRefreshToken(): string | null {
			if (typeof window === 'undefined') return null
			return localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY)
		},

		setRefreshToken(token: string): void {
			if (typeof window === 'undefined') return
			localStorage.setItem(LEGACY_REFRESH_TOKEN_KEY, token)
		},

		getTokenExpiry(): number | null {
			if (typeof window === 'undefined') return null
			const expiry = localStorage.getItem(LEGACY_TOKEN_EXPIRY_KEY)
			return expiry ? Number.parseInt(expiry, 10) : null
		},

		setTokenExpiry(expiry: number): void {
			if (typeof window === 'undefined') return
			localStorage.setItem(LEGACY_TOKEN_EXPIRY_KEY, expiry.toString())
		},

		clearAll(): void {
			if (typeof window === 'undefined') return
			localStorage.removeItem(LEGACY_TOKEN_KEY)
			localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY)
			localStorage.removeItem(LEGACY_TOKEN_EXPIRY_KEY)
		},
	}
}
