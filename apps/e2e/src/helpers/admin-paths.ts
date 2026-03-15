/**
 * Admin UI base path helper.
 *
 * The Vite dev server (UI project, port 3001) serves at "/".
 * The NestJS backend (admin-serve project, port 3000) serves at "/admin/".
 *
 * This detects the correct prefix based on UI_BASE_URL so page objects
 * and tests work for both project types.
 */
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://localhost:3001'

/** "/admin" when served from backend, "" when served from Vite dev server */
export const ADMIN_PREFIX = UI_BASE_URL.includes(':3001') ? '' : '/admin'

/** Build an admin route path */
export function adminPath(path: string): string {
	if (path.startsWith('/')) {
		return `${ADMIN_PREFIX}${path}`
	}
	return `${ADMIN_PREFIX}/${path}`
}

/** Regex that matches any admin URL that is NOT the auth page */
export const POST_LOGIN_URL = UI_BASE_URL.includes(':3001')
	? /^(?!.*\/auth)/
	: /\/admin\/(?!auth)/
