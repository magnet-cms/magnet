/**
 * RBAC module constants
 */

/**
 * Injection token for the Role model
 */
export const ROLE_MODEL = 'ROLE_MODEL'

/**
 * Injection token for RBAC configuration
 */
export const RBAC_CONFIG = 'RBAC_CONFIG'

/**
 * Default system roles
 */
export const DEFAULT_ROLES = {
	ADMIN: 'admin',
	AUTHENTICATED: 'authenticated',
	PUBLIC: 'public',
} as const

/**
 * Wildcard permission (grants all permissions)
 */
export const WILDCARD_PERMISSION = '*'

/**
 * Permission categories
 */
export const PERMISSION_CATEGORIES = {
	CONTENT: 'content',
	USERS: 'users',
	SETTINGS: 'settings',
	MEDIA: 'media',
	PLUGINS: 'plugins',
	SYSTEM: 'system',
} as const

/**
 * Standard CRUD actions for auto-generated permissions
 */
export const CRUD_ACTIONS = [
	'find',
	'findOne',
	'create',
	'update',
	'delete',
	'publish',
] as const

export type CrudAction = (typeof CRUD_ACTIONS)[number]
