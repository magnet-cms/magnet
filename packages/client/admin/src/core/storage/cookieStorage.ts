import type { TokenStorage } from '../adapters/types'

export interface CookieStorageOptions {
	/**
	 * Prefix for cookie names (default: 'magnet')
	 */
	prefix?: string

	/**
	 * Function to get a cookie value
	 */
	getCookie: (name: string) => string | undefined

	/**
	 * Function to set a cookie value
	 */
	setCookie: (
		name: string,
		value: string,
		options?: {
			maxAge?: number
			secure?: boolean
			sameSite?: 'strict' | 'lax' | 'none'
		},
	) => void

	/**
	 * Function to delete a cookie
	 */
	deleteCookie: (name: string) => void

	/**
	 * Default cookie options
	 */
	cookieOptions?: {
		secure?: boolean
		sameSite?: 'strict' | 'lax' | 'none'
		maxAge?: number
	}
}

/**
 * Creates a cookie-based token storage
 * Useful for Next.js or other SSR frameworks where you need cookies for auth
 *
 * @example
 * // With js-cookie
 * import Cookies from 'js-cookie'
 *
 * const storage = createCookieStorage({
 *   getCookie: (name) => Cookies.get(name),
 *   setCookie: (name, value, opts) => Cookies.set(name, value, opts),
 *   deleteCookie: (name) => Cookies.remove(name),
 * })
 *
 * @example
 * // With Next.js cookies
 * import { cookies } from 'next/headers'
 *
 * const storage = createCookieStorage({
 *   getCookie: (name) => cookies().get(name)?.value,
 *   setCookie: (name, value) => cookies().set(name, value),
 *   deleteCookie: (name) => cookies().delete(name),
 * })
 */
export function createCookieStorage(
	options: CookieStorageOptions,
): TokenStorage {
	const {
		prefix = 'magnet',
		getCookie,
		setCookie,
		deleteCookie,
		cookieOptions = { secure: true, sameSite: 'strict' },
	} = options

	const tokenKey = `${prefix}_token`
	const refreshTokenKey = `${prefix}_refresh_token`
	const expiryKey = `${prefix}_token_expiry`

	return {
		getAccessToken(): string | null {
			return getCookie(tokenKey) || null
		},

		setAccessToken(token: string): void {
			setCookie(tokenKey, token, cookieOptions)
		},

		getRefreshToken(): string | null {
			return getCookie(refreshTokenKey) || null
		},

		setRefreshToken(token: string): void {
			setCookie(refreshTokenKey, token, cookieOptions)
		},

		getTokenExpiry(): number | null {
			const expiry = getCookie(expiryKey)
			return expiry ? Number.parseInt(expiry, 10) : null
		},

		setTokenExpiry(expiry: number): void {
			setCookie(expiryKey, expiry.toString(), cookieOptions)
		},

		clearAll(): void {
			deleteCookie(tokenKey)
			deleteCookie(refreshTokenKey)
			deleteCookie(expiryKey)
		},
	}
}
