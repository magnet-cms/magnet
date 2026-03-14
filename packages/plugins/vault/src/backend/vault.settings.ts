import { SettingField, Settings } from '@magnet-cms/common'

/**
 * Vault settings schema.
 *
 * These settings control Vault connection and secret resolution behavior.
 * Manageable from the admin settings panel.
 *
 * SECURITY NOTE: Vault tokens and secret IDs are NEVER stored here.
 * They are read from environment variables (VAULT_TOKEN, VAULT_SECRET_ID).
 * The admin UI shows informational labels directing users to set env vars.
 */
@Settings({
	group: 'vault',
	label: 'Vault',
	icon: 'key-round',
	order: 15,
	description: 'Configure HashiCorp Vault for secrets management',
	sections: [
		{
			name: 'connection',
			label: 'Connection',
			icon: 'plug',
			description: 'Vault server connection settings',
			order: 1,
		},
		{
			name: 'paths',
			label: 'Secret Paths',
			icon: 'folder-key',
			description: 'Configure secret path conventions',
			order: 2,
		},
		{
			name: 'cache',
			label: 'Cache',
			icon: 'database',
			description: 'Secret caching configuration',
			order: 3,
		},
	],
})
export class VaultSettings {
	// Connection settings
	@SettingField.Boolean({
		label: 'Enable Vault',
		description: 'Enable HashiCorp Vault integration for secrets management',
		default: false,
		section: 'connection',
		order: 1,
	})
	enabled = false

	@SettingField.Text({
		label: 'Vault URL',
		description:
			'Vault server URL (e.g., https://vault.example.com:8200). Can also be set via VAULT_ADDR env var.',
		default: '',
		section: 'connection',
		order: 2,
	})
	url = ''

	@SettingField.Select({
		label: 'Authentication Method',
		description:
			'How to authenticate with Vault. Credentials are read from environment variables (VAULT_TOKEN or VAULT_ROLE_ID/VAULT_SECRET_ID).',
		default: 'token',
		options: ['token', 'appRole'],
		section: 'connection',
		order: 3,
	})
	authMethod = 'token'

	// Path settings
	@SettingField.Text({
		label: 'Mount Path',
		description: 'Vault secrets engine mount path',
		default: 'secret',
		section: 'paths',
		order: 1,
	})
	mountPath = 'secret'

	@SettingField.Text({
		label: 'Convention Prefix',
		description:
			'Prefix for convention-based secret paths (e.g., "magnet" maps to secret/data/magnet/{module})',
		default: 'magnet',
		section: 'paths',
		order: 2,
	})
	conventionPrefix = 'magnet'

	@SettingField.JSON({
		label: 'Secret Mappings',
		description:
			'Explicit path-to-config mappings. Each entry: { path, mapTo, watch? }',
		default: { mappings: [] },
		section: 'paths',
		order: 3,
	})
	secretMappings: Record<string, unknown> = { mappings: [] }

	// Cache settings
	@SettingField.Number({
		label: 'Cache TTL (seconds)',
		description:
			'How long resolved secrets are cached before re-fetching from Vault',
		default: 300,
		section: 'cache',
		order: 1,
	})
	cacheTtl = 300

	@SettingField.Boolean({
		label: 'Enable Cache',
		description: 'Cache resolved secrets to reduce Vault API calls',
		default: true,
		section: 'cache',
		order: 2,
	})
	cacheEnabled = true
}
