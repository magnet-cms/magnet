'use client'

import { Button } from '@magnet-cms/ui'
import { KeyRound, Plus } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '~/features/shared'
import { useAppIntl } from '~/i18n'
import { SecretBrowser } from './components/SecretBrowser'
import { VaultSidePanel } from './components/VaultSidePanel'

export function VaultPage() {
	const intl = useAppIntl()
	const [drawerOpen, setDrawerOpen] = useState(false)
	const [editingKey, setEditingKey] = useState<string | undefined>(undefined)

	const handleOpenCreate = () => {
		setEditingKey(undefined)
		setDrawerOpen(true)
	}

	const handleDrawerOpenChange = (open: boolean) => {
		setDrawerOpen(open)
		if (!open) setEditingKey(undefined)
	}

	return (
		<div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
			{/* Header */}
			<PageHeader>
				<div className="h-16 flex items-center justify-between gap-3 px-6">
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
					<Button size="sm" onClick={handleOpenCreate}>
						<Plus className="w-3.5 h-3.5 mr-1.5" />
						{intl.formatMessage({
							id: 'vault.secrets.createSecret',
							defaultMessage: 'New Secret',
						})}
					</Button>
				</div>
			</PageHeader>

			{/* Two-column body: table area (same pattern as Access Control) + sidebar */}
			<div className="flex-1 flex overflow-hidden bg-gray-50/50">
				<div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
					<div className="flex-1 overflow-hidden relative">
						<div className="absolute inset-0 overflow-auto">
							<SecretBrowser
								drawerOpen={drawerOpen}
								editingKey={editingKey}
								onDrawerOpenChange={handleDrawerOpenChange}
								onEdit={(key) => {
									setEditingKey(key)
									setDrawerOpen(true)
								}}
							/>
						</div>
					</div>
				</div>
				<VaultSidePanel />
			</div>
		</div>
	)
}
