'use client'

import { Badge, Card, CardContent } from '@magnet-cms/ui'
import { Info, Shield } from 'lucide-react'
import type { ReactElement } from 'react'
import { useAppIntl } from '~/i18n'

interface ExternalAuthBannerProps {
	/** Name of the external auth strategy (e.g., 'Supabase', 'Clerk') */
	strategyName: string
	/** OAuth providers configured in the external service */
	providers: string[]
	/** Additional provider settings for info display */
	providerSettings?: Record<string, unknown>
}

/**
 * Informational banner displayed when authentication is managed by an
 * external provider. Replaces the editable auth settings form.
 */
export function ExternalAuthBanner({
	strategyName,
	providers,
	providerSettings,
}: ExternalAuthBannerProps): ReactElement {
	const intl = useAppIntl()
	const displayName =
		strategyName.charAt(0).toUpperCase() + strategyName.slice(1)

	return (
		<div className="space-y-6" data-testid="external-auth-banner">
			{/* Info Banner */}
			<Card className="overflow-hidden border border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
				<div className="flex items-center gap-2 border-b border-blue-100 px-6 py-4 dark:border-blue-900">
					<Shield className="size-[18px] text-blue-500 dark:text-blue-400" />
					<h2 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
						{intl.formatMessage(
							{
								id: 'settings.auth.externalBanner.title',
								defaultMessage: 'Authentication managed by {provider}',
							},
							{ provider: displayName },
						)}
					</h2>
				</div>
				<CardContent className="px-6 py-4">
					<div className="flex items-start gap-3">
						<Info className="mt-0.5 size-4 shrink-0 text-blue-400 dark:text-blue-300" />
						<p className="text-sm text-blue-800 dark:text-blue-200">
							{intl.formatMessage(
								{
									id: 'settings.auth.externalBanner.description',
									defaultMessage:
										'Authentication settings are configured in your {provider} dashboard. Changes to login methods, password policies, and security settings should be made there.',
								},
								{ provider: displayName },
							)}
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Detected Providers */}
			{providers.length > 0 && (
				<Card className="overflow-hidden">
					<div className="border-b border-border px-6 py-4">
						<h2 className="text-sm font-semibold text-foreground">
							{intl.formatMessage({
								id: 'settings.auth.externalBanner.providers',
								defaultMessage: 'Configured Login Providers',
							})}
						</h2>
					</div>
					<CardContent className="px-6 py-4">
						<div className="flex flex-wrap gap-2">
							{providers.map((provider) => (
								<Badge
									key={provider}
									variant="secondary"
									className="text-xs capitalize"
								>
									{provider}
								</Badge>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Provider Settings */}
			{providerSettings && Object.keys(providerSettings).length > 0 && (
				<Card className="overflow-hidden">
					<div className="border-b border-border px-6 py-4">
						<h2 className="text-sm font-semibold text-foreground">
							{intl.formatMessage({
								id: 'settings.auth.externalBanner.providerSettings',
								defaultMessage: 'Provider Settings',
							})}
						</h2>
					</div>
					<CardContent className="px-6 py-4">
						<div className="space-y-2">
							{Object.entries(providerSettings).map(
								([key, value]) =>
									value !== undefined &&
									value !== null && (
										<div
											key={key}
											className="flex items-center justify-between text-sm"
										>
											<span className="capitalize text-muted-foreground">
												{key.replace(/([A-Z])/g, ' $1').trim()}
											</span>
											<span className="font-medium text-foreground">
												{typeof value === 'boolean'
													? value
														? intl.formatMessage({
																id: 'settings.auth.externalBanner.enabled',
																defaultMessage: 'Enabled',
															})
														: intl.formatMessage({
																id: 'settings.auth.externalBanner.disabled',
																defaultMessage: 'Disabled',
															})
													: String(value)}
											</span>
										</div>
									),
							)}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
