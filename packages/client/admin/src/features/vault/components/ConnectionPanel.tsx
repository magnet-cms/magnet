'use client'

import { Button, Skeleton } from '@magnet-cms/ui'
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useVaultClearCache, useVaultStatus } from '~/hooks/useVault'
import { useAppIntl } from '~/i18n'

const ADAPTER_LABELS: Record<string, string> = {
	db: 'Database (built-in)',
	hashicorp: 'HashiCorp Vault',
	supabase: 'Supabase Vault',
}

export function ConnectionPanel() {
	const intl = useAppIntl()
	const { data: status, isLoading, error, refetch } = useVaultStatus()
	const { mutate: clearCache, isPending: isClearingCache } =
		useVaultClearCache()

	const handleClearCache = () => {
		clearCache(undefined, {
			onSuccess: () => {
				toast.success(
					intl.formatMessage({
						id: 'vault.cache.clearSuccess',
						defaultMessage: 'Cache cleared',
					}),
				)
			},
			onError: () => {
				toast.error(
					intl.formatMessage({
						id: 'vault.cache.clearError',
						defaultMessage: 'Failed to clear cache',
					}),
				)
			},
		})
	}

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-20 w-full" />
				<Skeleton className="h-20 w-full" />
			</div>
		)
	}

	if (error || !status) {
		return (
			<div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
				<XCircle className="w-5 h-5 text-red-500 shrink-0" />
				<p className="text-sm text-red-700">
					{error?.message ?? 'Failed to load vault status'}
				</p>
				<Button variant="ghost" size="sm" onClick={() => refetch()}>
					<RefreshCw className="w-3.5 h-3.5 mr-1" />
					Retry
				</Button>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{/* Health status card */}
			<div className="rounded-lg border border-gray-200 bg-white p-5">
				<div className="flex items-start justify-between">
					<div>
						<h3 className="text-sm font-medium text-gray-900">Vault Status</h3>
						<p className="text-xs text-gray-500 mt-0.5">
							Adapter: {ADAPTER_LABELS[status.adapter] ?? status.adapter}
						</p>
					</div>
					<div className="flex items-center gap-2">
						{status.healthy ? (
							<span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
								<CheckCircle2 className="w-3.5 h-3.5" />
								Healthy
							</span>
						) : (
							<span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
								<XCircle className="w-3.5 h-3.5" />
								Unhealthy
							</span>
						)}
						<Button
							variant="ghost"
							size="sm"
							onClick={() => refetch()}
							title="Refresh status"
						>
							<RefreshCw className="w-3.5 h-3.5" />
						</Button>
					</div>
				</div>
			</div>

			{/* Master key warning for DB adapter */}
			{status.adapter === 'db' && (
				<div
					className={`rounded-lg border p-5 ${
						status.masterKeyConfigured
							? 'border-green-200 bg-green-50'
							: 'border-amber-200 bg-amber-50'
					}`}
				>
					<div className="flex items-start gap-3">
						{status.masterKeyConfigured ? (
							<CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
						) : (
							<AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
						)}
						<div>
							<p
								className={`text-sm font-medium ${
									status.masterKeyConfigured
										? 'text-green-800'
										: 'text-amber-800'
								}`}
							>
								{status.masterKeyConfigured
									? 'VAULT_MASTER_KEY is configured'
									: 'VAULT_MASTER_KEY is not set'}
							</p>
							{!status.masterKeyConfigured && (
								<p className="text-xs text-amber-700 mt-1">
									The DB vault adapter requires a 32-byte encryption key. Set
									the{' '}
									<code className="font-mono bg-amber-100 px-1 rounded">
										VAULT_MASTER_KEY
									</code>{' '}
									environment variable. Generate one with:
									<br />
									<code className="font-mono text-xs bg-amber-100 px-1 rounded block mt-1">
										node -e
										&quot;console.log(require(&apos;crypto&apos;).randomBytes(32).toString(&apos;hex&apos;))&quot;
									</code>
								</p>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Cache management */}
			<div className="rounded-lg border border-gray-200 bg-white p-5">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-sm font-medium text-gray-900">Secret Cache</h3>
						<p className="text-xs text-gray-500 mt-0.5">
							Clear the in-memory cache to force re-fetching secrets from the
							vault backend.
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={handleClearCache}
						disabled={isClearingCache}
					>
						<RefreshCw
							className={`w-3.5 h-3.5 mr-1.5 ${isClearingCache ? 'animate-spin' : ''}`}
						/>
						Clear Cache
					</Button>
				</div>
			</div>
		</div>
	)
}
