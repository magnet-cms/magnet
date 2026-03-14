import { ConnectionPanel } from './ConnectionPanel'
import { MappingsPanel } from './MappingsPanel'
import { SecretBrowser } from './SecretBrowser'

/**
 * Vault settings page for the admin panel.
 *
 * Provides connection configuration, secret browsing, and mapping management.
 */
const VaultSettings = () => {
	return (
		<div className="p-6 max-w-4xl mx-auto space-y-8">
			<div>
				<h2 className="text-2xl font-semibold tracking-tight">Vault</h2>
				<p className="text-sm text-muted-foreground mt-1">
					Manage HashiCorp Vault integration for secrets management.
				</p>
			</div>

			<div className="space-y-8">
				<div className="rounded-xl border bg-card p-6">
					<ConnectionPanel />
				</div>

				<div className="rounded-xl border bg-card p-6">
					<SecretBrowser />
				</div>

				<div className="rounded-xl border bg-card p-6">
					<MappingsPanel />
				</div>
			</div>
		</div>
	)
}

export default VaultSettings
