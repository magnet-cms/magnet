import { useAdapter } from '@magnet-cms/admin'
import { Button } from '@magnet-cms/ui/components'
import { CheckCircle, Plug, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface VaultStatus {
	configured: boolean
	connected: boolean
	url: string | null
	authMethod: string | null
	mountPath: string
}

/**
 * Connection panel showing Vault status and test connectivity button.
 */
export function ConnectionPanel() {
	const adapter = useAdapter()
	const [status, setStatus] = useState<VaultStatus | null>(null)
	const [testing, setTesting] = useState(false)
	const [testResult, setTestResult] = useState<{
		success: boolean
		error?: string
	} | null>(null)

	const fetchStatus = useCallback(async () => {
		try {
			const data = await adapter.request<VaultStatus>('/api/vault/status')
			setStatus(data)
		} catch {
			setStatus(null)
		}
	}, [adapter])

	useEffect(() => {
		fetchStatus()
	}, [fetchStatus])

	const handleTestConnection = async () => {
		setTesting(true)
		setTestResult(null)
		try {
			const result = await adapter.request<{
				success: boolean
				error?: string
			}>('/api/vault/test-connection', { method: 'POST' })
			setTestResult(result)
		} catch (err) {
			setTestResult({
				success: false,
				error: err instanceof Error ? err.message : 'Connection test failed',
			})
		} finally {
			setTesting(false)
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2 mb-4">
				<Plug className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
				<h3 className="text-lg font-medium">Connection</h3>
			</div>

			<div className="rounded-lg border p-4 space-y-3">
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium">Status</span>
					{status?.connected ? (
						<span className="inline-flex items-center gap-1 text-sm text-green-600">
							<CheckCircle className="h-4 w-4" aria-hidden="true" />
							Connected
						</span>
					) : status?.configured ? (
						<span className="inline-flex items-center gap-1 text-sm text-red-600">
							<XCircle className="h-4 w-4" aria-hidden="true" />
							Disconnected
						</span>
					) : (
						<span className="text-sm text-muted-foreground">
							Not configured
						</span>
					)}
				</div>

				{status?.configured && (
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Auth Method</span>
						<span className="text-sm text-muted-foreground">
							{status.authMethod}
						</span>
					</div>
				)}

				<div className="flex items-center justify-between">
					<span className="text-sm font-medium">Mount Path</span>
					<span className="text-sm text-muted-foreground">
						{status?.mountPath ?? 'secret'}
					</span>
				</div>

				<div className="pt-2 border-t">
					<p className="text-xs text-muted-foreground mb-2">
						Authentication credentials are read from environment variables. Set{' '}
						<code className="bg-muted px-1 rounded">VAULT_ADDR</code> and{' '}
						<code className="bg-muted px-1 rounded">VAULT_TOKEN</code> (or{' '}
						<code className="bg-muted px-1 rounded">VAULT_ROLE_ID</code> /{' '}
						<code className="bg-muted px-1 rounded">VAULT_SECRET_ID</code> for
						AppRole auth).
					</p>
				</div>
			</div>

			<div className="flex items-center gap-3">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={handleTestConnection}
					disabled={testing || !status?.configured}
				>
					{testing ? 'Testing...' : 'Test Connection'}
				</Button>

				{testResult && (
					<span
						className={`text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}
					>
						{testResult.success
							? 'Connection successful'
							: (testResult.error ?? 'Connection failed')}
					</span>
				)}
			</div>
		</div>
	)
}
