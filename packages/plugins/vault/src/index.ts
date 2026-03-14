// Plugin definition
export { VaultPlugin } from './plugin'

// Backend exports
export {
	VaultBootstrap,
	VaultClient,
	VaultController,
	VaultModule,
	VaultService,
	VaultSettings,
	EnvFallbackClient,
	createVaultClient,
} from './backend'

// Type exports
export type {
	VaultAuthConfig,
	VaultTokenAuth,
	VaultAppRoleAuth,
	VaultConfig,
	VaultSecretMapping,
	VaultBootstrapOptions,
	VaultBootstrapPathConfig,
	VaultResolvedSecrets,
	VaultClientInterface,
	VaultSecretData,
	VaultPluginOptions,
	VaultStatusResponse,
	VaultTestConnectionResponse,
	CachedSecret,
} from './backend'
