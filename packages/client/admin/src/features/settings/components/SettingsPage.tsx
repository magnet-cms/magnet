'use client'

import type { SchemaMetadata } from '@magnet-cms/common'
import { Button, Skeleton } from '@magnet-cms/ui'
import { cn } from '@magnet-cms/ui/lib/utils'
import { Loader2, Save } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAdapter } from '~/core/provider/MagnetProvider'
import { useSettings } from '~/hooks/useDiscovery'
import { PageHeader } from '../../shared'
import type { SettingsTab } from '../types'
import { getIconComponent } from '../utils/iconMap'
import { parseSettingsTabs } from '../utils/parseSchema'
import {
	DynamicSettingsForm,
	type DynamicSettingsFormRef,
} from './DynamicSettingsForm'
import { SettingsDocumentationPanel } from './SettingsDocumentationPanel'

/**
 * Settings page with dynamic tabs based on registered settings schemas.
 * Each registered setting appears as a tab, ordered by the `order` property.
 */
export function SettingsPage() {
	const adapter = useAdapter()
	const formRef = useRef<DynamicSettingsFormRef>(null)
	const [saving, setSaving] = useState(false)
	const [tabs, setTabs] = useState<SettingsTab[]>([])
	const [activeTab, setActiveTab] = useState<string>('')
	const [loadingTabs, setLoadingTabs] = useState(true)
	const initialTabSet = useRef(false)

	// Fetch all settings schema names
	const { data: settingsNames, isLoading: namesLoading } = useSettings()

	// Load full schema metadata for all settings to build tabs
	const loadSchemas = useCallback(async () => {
		if (!settingsNames || settingsNames.length === 0) {
			setLoadingTabs(false)
			return
		}

		setLoadingTabs(true)
		try {
			const schemas = await Promise.all(
				settingsNames.map((name) => adapter.discovery.getSetting(name)),
			)

			// Filter out errors and cast to SchemaMetadata
			const validSchemas = schemas.filter(
				(s): s is SchemaMetadata => !('error' in s),
			)
			const parsedTabs = parseSettingsTabs(validSchemas)
			setTabs(parsedTabs)

			// Set first tab as active only on initial load
			if (!initialTabSet.current) {
				const firstTab = parsedTabs[0]
				if (firstTab) {
					setActiveTab(firstTab.id)
					initialTabSet.current = true
				}
			}
		} finally {
			setLoadingTabs(false)
		}
	}, [settingsNames, adapter])

	useEffect(() => {
		loadSchemas()
	}, [loadSchemas])

	const handleSave = async () => {
		setSaving(true)
		try {
			await formRef.current?.save()
		} finally {
			setSaving(false)
		}
	}

	const handleReset = () => {
		formRef.current?.reset()
	}

	const activeTabData = useMemo(
		() => tabs.find((t) => t.id === activeTab),
		[tabs, activeTab],
	)

	const isLoading = namesLoading || loadingTabs

	// Loading state
	if (isLoading) {
		return (
			<div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
				<PageHeader>
					<div className="h-16 flex items-center justify-between px-6">
						<div>
							<Skeleton className="h-6 w-40 mb-2" />
							<Skeleton className="h-4 w-64" />
						</div>
						<div className="flex items-center gap-3">
							<Skeleton className="h-9 w-16" />
							<Skeleton className="h-9 w-28" />
						</div>
					</div>
				</PageHeader>
				<header className="shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-md z-20 sticky top-0">
					<div className="px-8 flex items-center gap-6 border-b border-gray-100">
						<Skeleton className="h-10 w-32" />
						<Skeleton className="h-10 w-32" />
						<Skeleton className="h-10 w-32" />
					</div>
				</header>
				<div className="flex-1 flex overflow-hidden bg-gray-50/50">
					<div className="flex-1 overflow-y-auto p-6">
						<div className="space-y-8">
							<Skeleton className="h-48 w-full rounded-lg" />
							<Skeleton className="h-32 w-full rounded-lg" />
						</div>
					</div>
				</div>
			</div>
		)
	}

	// No settings registered
	if (tabs.length === 0) {
		return (
			<div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
				<PageHeader>
					<div className="h-16 flex items-center px-6">
						<div>
							<h1 className="text-lg font-semibold text-gray-900 tracking-tight">
								Settings
							</h1>
							<p className="text-xs text-gray-500">
								No settings have been registered yet.
							</p>
						</div>
					</div>
				</PageHeader>
				<div className="flex-1 flex items-center justify-center bg-gray-50/50">
					<div className="text-center text-gray-500">
						<p className="text-sm">No settings schemas found.</p>
						<p className="text-xs mt-1">
							Register settings using the @Settings decorator in your backend
							modules.
						</p>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
			<PageHeader>
				<div className="h-16 flex items-center justify-between px-6">
					<div>
						<h1 className="text-lg font-semibold text-gray-900 tracking-tight">
							{activeTabData?.label ?? 'Settings'}
						</h1>
						{activeTabData?.description && (
							<p className="text-xs text-gray-500">
								{activeTabData.description}
							</p>
						)}
					</div>
					<div className="flex items-center gap-3">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleReset}
						>
							Reset
						</Button>
						<Button
							type="button"
							size="sm"
							onClick={handleSave}
							disabled={saving}
						>
							{saving ? (
								<Loader2 className="w-3.5 h-3.5 animate-spin" />
							) : (
								<Save className="w-3.5 h-3.5" />
							)}
							Save Changes
						</Button>
					</div>
				</div>
			</PageHeader>

			{/* Dynamic Tabs */}
			<header className="shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-md z-20 sticky top-0">
				<div className="px-8 flex items-center gap-6 border-b border-gray-100 overflow-x-auto">
					{tabs.map((tab) => {
						const IconComponent = getIconComponent(tab.icon)
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id)}
								className={cn(
									'py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap',
									activeTab === tab.id
										? 'text-gray-900 border-gray-900'
										: 'text-gray-500 hover:text-gray-900 border-transparent hover:border-gray-200',
								)}
							>
								{IconComponent && <IconComponent className="w-4 h-4" />}
								{tab.label}
							</button>
						)
					})}
				</div>
			</header>

			{/* Content Body */}
			<div className="flex-1 flex overflow-hidden bg-gray-50/50">
				<div className="flex-1 overflow-y-auto p-6">
					<div className="space-y-8 pb-10">
						{activeTab && (
							<DynamicSettingsForm ref={formRef} group={activeTab} />
						)}
					</div>
				</div>
				{/* Fixed Right Sidebar - Documentation */}
				<SettingsDocumentationPanel activeSection={activeTab} />
			</div>
		</div>
	)
}
