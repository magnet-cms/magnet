import { SettingField, Settings } from '@magnet-cms/common'

/**
 * API Keys settings schema.
 *
 * These settings control API key behavior, rate limits, and security policies.
 *
 * @example
 * ```typescript
 * // In a service
 * const settings = await settingsService.get(ApiKeySettings)
 * if (settings.requireIpWhitelist && !dto.allowedIps?.length) {
 *   throw new Error('IP whitelist is required')
 * }
 * ```
 */
@Settings({
	group: 'api-keys',
	label: 'API Keys',
	icon: 'key',
	order: 20,
	description: 'Configure API key behavior and security policies',
})
export class ApiKeySettings {
	@SettingField.Boolean({
		label: 'Enable API Keys',
		description: 'Allow API key authentication for programmatic access',
		default: true,
	})
	enabled = true

	@SettingField.Number({
		label: 'Default Rate Limit (per hour)',
		description: 'Default maximum requests per hour for new API keys',
		default: 1000,
	})
	defaultRateLimit = 1000

	@SettingField.Number({
		label: 'Max Keys Per User',
		description: 'Maximum number of API keys a user can create',
		default: 10,
	})
	maxKeysPerUser = 10

	@SettingField.Number({
		label: 'Usage Log Retention (days)',
		description: 'How long to keep API key usage logs',
		default: 30,
	})
	usageRetentionDays = 30

	@SettingField.Boolean({
		label: 'Require IP Whitelist',
		description: 'Force all API keys to have IP restrictions',
		default: false,
	})
	requireIpWhitelist = false

	@SettingField.Boolean({
		label: 'Allow Wildcard Permissions',
		description: 'Allow keys with full access (*) permission',
		default: true,
	})
	allowWildcardPermissions = true

	@SettingField.Number({
		label: 'Max Rate Limit',
		description: 'Maximum rate limit that can be set on an API key',
		default: 10000,
	})
	maxRateLimit = 10000
}
