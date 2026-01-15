import {
	Badge,
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Tabs,
	TabsList,
	TabsTrigger,
} from '@magnet/ui/components'
import { formatDistanceToNow } from 'date-fns'
import { ChevronDown, Globe, MoreVertical } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import type { LocaleOption } from '~/components/LocaleSwitcher'
import type { LocaleStatus } from '~/core/adapters/types'
import { HEADER_STATUS_PORTAL_ID } from '~/layouts/DashboardLayout'

interface LocaleProps {
	currentLocale: string
	locales: LocaleOption[]
	localeStatuses?: Record<string, LocaleStatus>
	onLocaleChange: (locale: string) => void
	onAddLocale?: (locale: string) => void
	disabled?: boolean
}

interface MoreMenuItem {
	label: string
	onClick: () => void
	variant?: 'destructive'
}

interface AutoSaveStatus {
	isSaving: boolean
	lastSaved: Date | null
	error: Error | null
}

interface ContentHeaderProps {
	// Base path for tab navigation (e.g., "/content-manager/cat/123")
	basePath?: string
	title: string
	status?: 'draft' | 'published'
	lastEdited?: Date | string
	tabs?: { label: string; to: string }[]
	// Actions
	onDiscard?: () => void
	onSave?: () => void
	isSaving?: boolean
	saveLabel?: string
	// Auto-save status (optional - for Payload-style auto-save UI)
	autoSaveStatus?: AutoSaveStatus
	// Locale (optional)
	localeProps?: LocaleProps
	// More menu (optional)
	moreMenuItems?: MoreMenuItem[]
}

export const ContentHeader = ({
	basePath,
	title,
	status,
	lastEdited,
	tabs,
	onDiscard,
	onSave,
	isSaving,
	saveLabel = 'Save changes',
	autoSaveStatus,
	localeProps,
	moreMenuItems,
}: ContentHeaderProps) => {
	const location = useLocation()
	const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
		null,
	)

	// Find portal container on mount
	useEffect(() => {
		const container = document.getElementById(HEADER_STATUS_PORTAL_ID)
		setPortalContainer(container)

		// Cleanup: clear portal content on unmount
		return () => {
			if (container) {
				container.innerHTML = ''
			}
		}
	}, [])

	// Compute absolute tab paths using basePath
	const getTabPath = (tabTo: string) => {
		if (!basePath) return tabTo
		return tabTo === '' ? basePath : `${basePath}/${tabTo}`
	}

	const getActiveTab = () => {
		if (!tabs?.length) return ''
		const currentPath = location.pathname
		// Find the tab whose path matches the end of the current path
		const activeTab = tabs.find((tab) => {
			if (tab.to === '') {
				// Default tab - match when path ends with the document ID (basePath)
				return !tabs.some(
					(t) => t.to !== '' && currentPath.endsWith(`/${t.to}`),
				)
			}
			return currentPath.endsWith(`/${tab.to}`)
		})
		return activeTab?.to ?? ''
	}

	const formatLastEdited = (date: Date | string) => {
		const d = typeof date === 'string' ? new Date(date) : date
		return formatDistanceToNow(d, { addSuffix: true })
	}

	const currentLocaleName = localeProps?.locales.find(
		(l) => l.code === localeProps.currentLocale,
	)?.name

	// Format auto-save status text (falls back to lastEdited if no save in current session)
	const formatAutoSaveStatus = () => {
		if (!autoSaveStatus) return null
		if (autoSaveStatus.error) {
			return <span className="text-xs text-destructive">Save failed</span>
		}
		if (autoSaveStatus.isSaving) {
			return (
				<span className="text-xs text-muted-foreground flex items-center gap-1.5">
					<span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
					Saving...
				</span>
			)
		}
		if (autoSaveStatus.lastSaved) {
			return (
				<span className="text-xs text-muted-foreground">
					Saved{' '}
					{formatDistanceToNow(autoSaveStatus.lastSaved, { addSuffix: true })}
				</span>
			)
		}
		// Fall back to lastEdited from document if no save in current session
		if (lastEdited) {
			return (
				<span className="text-xs text-muted-foreground">
					Saved {formatLastEdited(lastEdited)}
				</span>
			)
		}
		return null
	}

	// Get auto-save status content (memoized to check if we have content)
	const autoSaveContent = autoSaveStatus ? formatAutoSaveStatus() : null

	// Status badge content for portal
	const statusContent = (status || lastEdited || autoSaveStatus) && (
		<>
			{status && (
				<Badge
					variant="outline"
					className="gap-1.5 bg-muted/50 border-border text-xs font-medium"
				>
					<div
						className={`w-1.5 h-1.5 rounded-full ${
							status === 'published' ? 'bg-green-500' : 'bg-amber-400'
						}`}
					/>
					{status === 'published' ? 'Published' : 'Draft'}
				</Badge>
			)}
			{autoSaveContent && (
				<>
					<div className="h-4 w-px bg-border" />
					{autoSaveContent}
				</>
			)}
			{!autoSaveStatus && lastEdited && (
				<>
					<div className="h-4 w-px bg-border" />
					<span className="text-xs text-muted-foreground">
						Last edited {formatLastEdited(lastEdited)}
					</span>
				</>
			)}
		</>
	)

	return (
		<>
			{/* Portal status badge to header */}
			{portalContainer &&
				statusContent &&
				createPortal(statusContent, portalContainer)}

			<header className="border-b border-border bg-background">
				{/* Main Action Bar */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-4">
					<div className="flex items-center gap-6">
						<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>

						{/* Tabs inline with Title */}
						{tabs && tabs.length > 0 && (
							<Tabs value={getActiveTab()} className="hidden sm:block">
								<TabsList className="bg-muted/80 p-0.5 h-auto">
									{tabs.map((tab) => (
										<TabsTrigger
											key={tab.to}
											value={tab.to}
											asChild
											className="px-3 py-1 text-xs data-[state=active]:shadow-sm"
										>
											<Link to={getTabPath(tab.to)}>{tab.label}</Link>
										</TabsTrigger>
									))}
								</TabsList>
							</Tabs>
						)}
					</div>

					{/* Action Toolbar */}
					<div className="flex items-center gap-3">
						{/* Locale Selector */}
						{localeProps && (
							<>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="sm"
											disabled={localeProps.disabled}
											className="gap-2 text-muted-foreground hover:text-foreground"
										>
											<Globe className="h-4 w-4" />
											<span>
												{currentLocaleName || localeProps.currentLocale}
											</span>
											<ChevronDown className="h-3 w-3" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-48">
										{localeProps.locales.map((locale) => {
											const status = localeProps.localeStatuses?.[locale.code]
											const hasContent =
												status?.hasDraft || status?.hasPublished
											return (
												<DropdownMenuItem
													key={locale.code}
													onClick={() =>
														localeProps.onLocaleChange(locale.code)
													}
													disabled={
														!hasContent &&
														locale.code !== localeProps.currentLocale
													}
													className="justify-between"
												>
													<span
														className={
															locale.code === localeProps.currentLocale
																? 'font-medium'
																: ''
														}
													>
														{locale.name}
													</span>
													{status?.hasPublished && (
														<Badge
															variant="secondary"
															className="text-[10px] px-1"
														>
															Published
														</Badge>
													)}
													{status?.hasDraft && !status?.hasPublished && (
														<Badge
															variant="outline"
															className="text-[10px] px-1"
														>
															Draft
														</Badge>
													)}
												</DropdownMenuItem>
											)
										})}
										{localeProps.onAddLocale && (
											<>
												<DropdownMenuSeparator />
												<div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
													Add Translation
												</div>
												{localeProps.locales
													.filter((l) => {
														const status = localeProps.localeStatuses?.[l.code]
														return !status?.hasDraft && !status?.hasPublished
													})
													.map((locale) => (
														<DropdownMenuItem
															key={`add-${locale.code}`}
															onClick={() =>
																localeProps.onAddLocale?.(locale.code)
															}
														>
															+ {locale.name}
														</DropdownMenuItem>
													))}
											</>
										)}
									</DropdownMenuContent>
								</DropdownMenu>
								<div className="h-6 w-px bg-border" />
							</>
						)}

						{/* Primary Actions */}
						{onDiscard && (
							<Button
								variant="ghost"
								size="sm"
								onClick={onDiscard}
								className="text-muted-foreground hover:text-foreground"
							>
								Discard
							</Button>
						)}
						{onSave && (
							<Button size="sm" onClick={onSave} disabled={isSaving}>
								{isSaving ? 'Saving...' : saveLabel}
							</Button>
						)}

						{/* More Menu */}
						{moreMenuItems && moreMenuItems.length > 0 && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" className="h-8 w-8">
										<MoreVertical className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									{moreMenuItems.map((item, index) => (
										<DropdownMenuItem
											key={`more-${item.label}-${index}`}
											onClick={item.onClick}
											className={
												item.variant === 'destructive'
													? 'text-destructive focus:text-destructive'
													: ''
											}
										>
											{item.label}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
				</div>
			</header>
		</>
	)
}
