import { PageContent, PageHeader, useAdapter } from '@magnet-cms/admin'
import { Badge, Card } from '@magnet-cms/ui/components'
import { Fragment, useEffect, useState } from 'react'

interface SentryClientConfig {
	dsn: string
	enabled: boolean
	environment: string
}

interface SentryApiStatus {
	connected: boolean
	organization: string | undefined
	project: string | undefined
	lastSync: string | null
}

interface SentryTokenScopes {
	orgRead: boolean
	projectRead: boolean
	eventRead: boolean
	alertsRead: boolean
}

const SCOPE_LABELS: Record<keyof SentryTokenScopes, string> = {
	orgRead: 'org:read',
	projectRead: 'project:read',
	eventRead: 'event:read',
	alertsRead: 'alerts:read',
}

/**
 * Sentry plugin settings page in the admin UI.
 *
 * Displays the current Sentry connection status, API connectivity, and
 * detected token scope availability.
 * Accessible at /sentry/settings in the admin sidebar.
 */
const SentrySettings = () => {
	const adapter = useAdapter()
	const [config, setConfig] = useState<SentryClientConfig | null>(null)
	const [apiStatus, setApiStatus] = useState<SentryApiStatus | null>(null)
	const [scopes, setScopes] = useState<SentryTokenScopes | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		async function fetchData() {
			try {
				const [configData, statusData, scopesData] = await Promise.all([
					adapter.request<SentryClientConfig>('/sentry/config'),
					adapter.request<SentryApiStatus>('/sentry/admin/status'),
					adapter.request<SentryTokenScopes>('/sentry/admin/scopes'),
				])
				setConfig(configData)
				setApiStatus(statusData)
				setScopes(scopesData)
			} catch {
				setError('Failed to load Sentry configuration.')
			} finally {
				setLoading(false)
			}
		}
		fetchData()
	}, [adapter])

	const maskedDsn = config?.dsn
		? config.dsn.replace(/\/\/(.+?)@/, '//***@')
		: '—'

	return (
		<>
			<PageHeader
				title="Sentry"
				description="Error tracking & performance monitoring"
			/>
			<PageContent>
				{loading ? (
					<div className="p-6 text-muted-foreground">Loading...</div>
				) : error ? (
					<div className="p-6 text-destructive">{error}</div>
				) : (
					<div className="space-y-4 p-6">
						<Card className="p-6">
							<h3 className="text-base font-semibold mb-4">
								Connection Status
							</h3>
							<dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
								<dt className="text-muted-foreground">Status</dt>
								<dd>
									<span
										className={
											config?.enabled
												? 'text-green-600 font-medium'
												: 'text-muted-foreground'
										}
									>
										{config?.enabled ? 'Enabled' : 'Disabled'}
									</span>
								</dd>
								<dt className="text-muted-foreground">DSN</dt>
								<dd className="font-mono text-xs break-all">{maskedDsn}</dd>
								<dt className="text-muted-foreground">Environment</dt>
								<dd>{config?.environment ?? '—'}</dd>
							</dl>
						</Card>

						<Card className="p-6">
							<h3 className="text-base font-semibold mb-4">API Connection</h3>
							<dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
								<dt className="text-muted-foreground">Status</dt>
								<dd>
									<Badge variant={apiStatus?.connected ? 'default' : 'outline'}>
										{apiStatus?.connected ? 'Connected' : 'Not configured'}
									</Badge>
								</dd>
								{apiStatus?.organization && (
									<>
										<dt className="text-muted-foreground">Organization</dt>
										<dd className="font-mono text-xs">
											{apiStatus.organization}
										</dd>
									</>
								)}
								{apiStatus?.project && (
									<>
										<dt className="text-muted-foreground">Project</dt>
										<dd className="font-mono text-xs">{apiStatus.project}</dd>
									</>
								)}
								{apiStatus?.lastSync && (
									<>
										<dt className="text-muted-foreground">Last sync</dt>
										<dd className="text-muted-foreground">
											{new Date(apiStatus.lastSync).toLocaleString()}
										</dd>
									</>
								)}
							</dl>
							{!apiStatus?.connected && (
								<p className="text-xs text-muted-foreground mt-3">
									Set <code className="font-mono">SENTRY_AUTH_TOKEN</code>,{' '}
									<code className="font-mono">SENTRY_ORG</code>, and{' '}
									<code className="font-mono">SENTRY_PROJECT</code> to enable
									API access.
								</p>
							)}
						</Card>

						{apiStatus?.connected && scopes && (
							<Card className="p-6">
								<h3 className="text-base font-semibold mb-4">Token Scopes</h3>
								<p className="text-xs text-muted-foreground mb-4">
									Detected permissions for the configured{' '}
									<code className="font-mono">SENTRY_AUTH_TOKEN</code>.
								</p>
								<dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
									{(
										Object.keys(SCOPE_LABELS) as (keyof SentryTokenScopes)[]
									).map((key) => (
										<Fragment key={key}>
											<dt className="text-muted-foreground font-mono text-xs self-center">
												{SCOPE_LABELS[key]}
											</dt>
											<dd>
												<Badge variant={scopes[key] ? 'default' : 'outline'}>
													{scopes[key] ? 'Available' : 'Not available'}
												</Badge>
											</dd>
										</Fragment>
									))}
								</dl>
							</Card>
						)}
					</div>
				)}
			</PageContent>
		</>
	)
}

export default SentrySettings
