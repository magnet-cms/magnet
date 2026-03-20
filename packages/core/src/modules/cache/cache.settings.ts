import { SettingField, Settings } from '@magnet-cms/common'

/**
 * Cache settings schema.
 *
 * Configures cache behavior and defaults, manageable from the admin Settings panel.
 */
@Settings({
	group: 'cache',
	label: 'Cache',
	icon: 'zap',
	order: 8,
	description: 'Configure cache behavior and time-to-live defaults',
	sections: [
		{
			name: 'general',
			label: 'General',
			icon: 'settings',
			description: 'General cache settings',
			order: 1,
		},
		{
			name: 'memory',
			label: 'Memory Adapter',
			icon: 'cpu',
			description: 'Settings for the built-in in-memory cache adapter',
			order: 2,
		},
	],
})
export class CacheSettings {
	@SettingField.Boolean({
		label: 'Enable Cache',
		description:
			'Master toggle for all caching. When disabled, cache reads always miss.',
		default: true,
		section: 'general',
		order: 1,
	})
	enabled = true

	@SettingField.Number({
		label: 'Default TTL (seconds)',
		description: 'Default time-to-live for cached entries, in seconds.',
		default: 300,
		section: 'general',
		order: 2,
	})
	defaultTtl = 300

	@SettingField.Number({
		label: 'Max Memory Entries',
		description:
			'Maximum number of entries in the in-memory cache before LRU eviction. Only applies to the memory adapter.',
		default: 1000,
		section: 'memory',
		order: 1,
	})
	maxMemoryEntries = 1000
}
