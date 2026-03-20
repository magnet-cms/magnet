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
			<Card className="border border-blue-200 bg-blue-50/50 overflow-hidden">
				<div className="px-6 py-4 border-b border-blue-100 flex items-center gap-2">
					<Shield className="w-[18px] h-[18px] text-blue-500" />
					<h2 className="text-sm font-semibold text-blue-900">
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
						<Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
						<p className="text-sm text-blue-800">
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
					<div className="px-6 py-4 border-b border-gray-100">
						<h2 className="text-sm font-semibold text-gray-900">
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
					<div className="px-6 py-4 border-b border-gray-100">
						<h2 className="text-sm font-semibold text-gray-900">
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
											<span className="text-gray-500 capitalize">
												{key.replace(/([A-Z])/g, ' $1').trim()}
											</span>
											<span className="text-gray-900 font-medium">
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
