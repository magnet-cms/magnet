import type { AdminServeOptions } from '../modules/admin-serve/admin-serve.module'

/**
 * Resolves MagnetModule `admin` global option into serve options.
 * Omitted or `undefined` defaults to serving the admin UI (same as `admin: true`).
 */
export function normalizeMagnetAdminConfig(
	admin?: boolean | { enabled?: boolean; path?: string; distPath?: string },
): AdminServeOptions {
	if (admin === false) {
		return { enabled: false, path: '/admin' }
	}
	if (admin === true || admin === undefined) {
		return { enabled: true, path: '/admin' }
	}
	return {
		enabled: admin.enabled ?? true,
		path: admin.path ?? '/admin',
		distPath: admin.distPath,
	}
}
