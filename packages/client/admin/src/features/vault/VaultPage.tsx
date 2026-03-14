'use client'

import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '~/features/shared'
import { type MessageId, useAppIntl } from '~/i18n'
import { ConnectionPanel } from './components/ConnectionPanel'
import { SecretBrowser } from './components/SecretBrowser'

type Tab = 'overview' | 'secrets'

const TABS: { id: Tab; labelKey: MessageId; defaultLabel: string }[] = [
	{ id: 'overview', labelKey: 'vault.tabs.overview', defaultLabel: 'Overview' },
	{ id: 'secrets', labelKey: 'vault.tabs.secrets', defaultLabel: 'Secrets' },
]

export function VaultPage() {
	const intl = useAppIntl()
	const [activeTab, setActiveTab] = useState<Tab>('overview')

	return (
		<div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
			{/* Header */}
			<PageHeader>
				<div className="h-16 flex items-center justify-between px-6">
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
							<KeyRound className="w-4 h-4 text-white" />
						</div>
						<div>
							<h1 className="text-lg font-semibold text-gray-900 tracking-tight">
								{intl.formatMessage({
									id: 'vault.title',
									defaultMessage: 'Vault',
								})}
							</h1>
							<p className="text-xs text-gray-500">
								{intl.formatMessage({
									id: 'vault.description',
									defaultMessage:
										'Manage encrypted secrets stored securely in your CMS',
								})}
							</p>
						</div>
					</div>
				</div>
			</PageHeader>

			{/* Tab bar */}
			<div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6">
				<div className="flex gap-0">
					{TABS.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
								activeTab === tab.id
									? 'border-gray-900 text-gray-900'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
							}`}
						>
							{intl.formatMessage({
								id: tab.labelKey,
								defaultMessage: tab.defaultLabel,
							})}
						</button>
					))}
				</div>
			</div>

			{/* Tab content */}
			<div className="flex-1 overflow-y-auto p-6">
				<div className="max-w-2xl">
					{activeTab === 'overview' && <ConnectionPanel />}
					{activeTab === 'secrets' && <SecretBrowser />}
				</div>
			</div>
		</div>
	)
}
