import { SettingField, Settings } from '@magnet-cms/common'

/**
 * RBAC settings schema.
 *
 * These settings control role-based access control behavior.
 *
 * @example
 * ```typescript
 * // In a service
 * const rbacConfig = await settingsService.get(RBACSettings)
 * if (!rbacConfig.enabled) {
 *   // Skip permission checks
 * }
 * ```
 */
@Settings({
	group: 'rbac',
	label: 'Access Control',
	icon: 'shield-check',
	order: 30,
	description: 'Configure role-based access control settings',
})
export class RBACSettings {
	@SettingField.Boolean({
		label: 'Enable RBAC',
		description: 'Enable role-based access control for content and features',
		default: true,
	})
	enabled = true

	@SettingField.Select({
		label: 'Default User Role',
		description: 'Default role assigned to new users',
		options: [
			{ label: 'Authenticated', value: 'authenticated' },
			{ label: 'Viewer', value: 'viewer' },
			{ label: 'Editor', value: 'editor' },
		],
		default: 'authenticated',
	})
	defaultUserRole = 'authenticated'

	@SettingField.Boolean({
		label: 'Allow Public Access',
		description: 'Allow unauthenticated users with public role permissions',
		default: false,
	})
	allowPublicAccess = false

	@SettingField.Boolean({
		label: 'Cache Permissions',
		description: 'Cache permission checks for better performance',
		default: true,
	})
	cachePermissions = true

	@SettingField.Number({
		label: 'Cache TTL (seconds)',
		description: 'How long permission checks are cached',
		default: 300,
	})
	cacheTTL = 300

	@SettingField.Boolean({
		label: 'Strict Mode',
		description:
			'Deny access to undefined permissions (recommended for production)',
		default: false,
	})
	strictMode = false

	@SettingField.Boolean({
		label: 'Log Permission Checks',
		description: 'Log permission checks for debugging (may impact performance)',
		default: false,
	})
	logPermissionChecks = false
}
