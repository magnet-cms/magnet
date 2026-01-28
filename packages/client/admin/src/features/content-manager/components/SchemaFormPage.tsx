'use client'

import {
	Badge,
	Button,
	Card,
	CardContent,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Skeleton,
} from '@magnet-cms/ui'
import { cn } from '@magnet-cms/ui/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { Check, Clock, Copy, Edit3, Globe, Info } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { ContentHeader } from '~/components/ContentHeader'
import { FormBuilder } from '~/components/FormBuilder'
import type { LocaleOption } from '~/components/LocaleSwitcher'
import { useAdapter, useMagnetConfig } from '~/core/provider/MagnetProvider'
import { useAutoSave } from '~/hooks/useAutoSave'
import { useSchema } from '~/hooks/useDiscovery'
import {
	useContentAddLocale,
	useContentItem,
	useContentPublish,
	useContentUnpublish,
	useContentVersions,
	useLocaleStatuses,
} from '~/hooks/useSchema'
import { RelationsAndMetadataPanel } from './RelationsAndMetadataPanel'

interface SchemaFormPageProps {
	schema: string
	schemaDisplayName: string
	entryId: string
}

// Generic content type
type ContentData = Record<string, unknown> & {
	_id?: string
	documentId?: string
	createdAt?: string
	updatedAt?: string
	publishedAt?: string
	status?: string
	locale?: string
}

// Version type with data for comparison
interface VersionWithData {
	versionId: string
	status: string
	createdAt: string
	createdBy?: string
	data?: Record<string, unknown>
}

// Helper functions for versions
const getInitials = (name?: string): string => {
	if (!name) return '?'
	const parts = name.trim().split(/\s+/)
	if (parts.length === 1) {
		return (parts[0] ?? '').substring(0, 2).toUpperCase()
	}
	const first = parts[0]?.[0] ?? ''
	const last = parts[parts.length - 1]?.[0] ?? ''
	return (first + last).toUpperCase()
}

const getChangedFields = (
	currentData: Record<string, unknown>,
	previousData?: Record<string, unknown>,
): string[] => {
	if (!previousData) return []
	const changes: string[] = []
	for (const key of Object.keys(currentData)) {
		const currentVal = currentData[key]
		const prevVal = previousData[key]
		if (JSON.stringify(currentVal) !== JSON.stringify(prevVal)) {
			const formatValue = (val: unknown): string => {
				if (val === null || val === undefined) return 'null'
				if (typeof val === 'object') return JSON.stringify(val)
				return String(val)
			}
			changes.push(
				`${key}: ${formatValue(prevVal)} → ${formatValue(currentVal)}`,
			)
		}
	}
	return changes
}

export function SchemaFormPage({
	schema,
	schemaDisplayName,
	entryId,
}: SchemaFormPageProps) {
	const navigate = useNavigate()
	const location = useLocation()
	const adapter = useAdapter()
	const config = useMagnetConfig()
	const queryClient = useQueryClient()
	const [currentLocale, setCurrentLocale] = useState('en')
	const [activeEndpoint, setActiveEndpoint] = useState('get-all')
	const [selectedApiLocale, setSelectedApiLocale] = useState<string>('')
	const [copied, setCopied] = useState<Record<string, boolean>>({})

	// Determine current view from URL path
	const currentView = useMemo(() => {
		const path = location.pathname
		if (path.endsWith('/versions')) return 'versions'
		if (path.endsWith('/api')) return 'api'
		return 'edit'
	}, [location.pathname])

	// Fetch schema metadata
	const { data: schemaMetadata, isLoading: isSchemaLoading } = useSchema(schema)

	// Get schema options for i18n and versioning
	const schemaOptions =
		schemaMetadata && 'options' in schemaMetadata
			? schemaMetadata.options
			: undefined
	const hasI18n = schemaOptions?.i18n !== false
	const hasVersioning = schemaOptions?.versioning !== false

	// Fetch available locales from settings
	const { data: localesConfig } = useQuery({
		queryKey: ['settings', 'locales'],
		queryFn: () => adapter.settings.getLocales(),
		enabled: hasI18n,
	})

	// Convert to LocaleOption format
	const availableLocales: LocaleOption[] = useMemo(() => {
		if (!localesConfig) return [{ code: 'en', name: 'English' }]
		return localesConfig.configured.map((code: string) => {
			const locale = localesConfig.available.find(
				(l: { value: string; key: string }) => l.value === code,
			)
			return { code, name: locale?.key ?? code }
		})
	}, [localesConfig])

	// Fetch locale statuses for the document
	const { data: localeStatuses } = useLocaleStatuses(schema, entryId)
	const currentLocaleStatus = localeStatuses?.[currentLocale]

	// Smart status detection - load draft if exists, otherwise published
	const effectiveStatus = useMemo(() => {
		if (!hasVersioning) return undefined
		if (currentLocaleStatus?.hasDraft) return 'draft'
		if (currentLocaleStatus?.hasPublished) return 'published'
		return 'draft' // Default for new documents
	}, [hasVersioning, currentLocaleStatus])

	// Fetch content data with smart status
	const {
		data: contentData,
		isLoading: isContentLoading,
		error: contentError,
	} = useContentItem<ContentData>(schema, entryId, {
		locale: hasI18n ? currentLocale : undefined,
		status: hasVersioning ? effectiveStatus : undefined,
	})

	// Fetch versions for versions tab
	const { data: versions } = useContentVersions(
		schema,
		entryId,
		hasI18n ? currentLocale : undefined,
	)

	// Mutations
	const { mutate: publishContent, isPending: isPublishing } =
		useContentPublish<ContentData>()
	const { mutate: unpublishContent, isPending: isUnpublishing } =
		useContentUnpublish()
	const { mutate: addLocale, isPending: isAddingLocale } =
		useContentAddLocale<ContentData>()

	// Version management mutations
	const publishVersionMutation = useMutation({
		mutationFn: (versionId: string) =>
			adapter.history.publishVersion(versionId),
		onSuccess: () => {
			toast.success('Version published', {
				description: 'The draft has been published successfully',
			})
			queryClient.invalidateQueries({ queryKey: ['versions', schema, entryId] })
			queryClient.invalidateQueries({
				queryKey: ['content', schema, entryId, 'locales'],
			})
		},
		onError: (error: Error) => {
			toast.error(`Failed to publish version: ${error.message}`)
		},
	})

	const archiveVersionMutation = useMutation({
		mutationFn: (versionId: string) =>
			adapter.history.archiveVersion(versionId),
		onSuccess: () => {
			toast.success('Version archived', {
				description: 'The version has been archived successfully',
			})
			queryClient.invalidateQueries({ queryKey: ['versions', schema, entryId] })
		},
		onError: (error: Error) => {
			toast.error(`Failed to archive version: ${error.message}`)
		},
	})

	const restoreVersionMutation = useMutation({
		mutationFn: (versionId: string) =>
			adapter.history.publishVersion(versionId),
		onSuccess: () => {
			toast.success('Version restored', {
				description: 'The selected version has been published',
			})
			queryClient.invalidateQueries({ queryKey: ['versions', schema, entryId] })
			queryClient.invalidateQueries({
				queryKey: ['content', schema, entryId, 'locales'],
			})
		},
		onError: (error: Error) => {
			toast.error(`Failed to restore version: ${error.message}`)
		},
	})

	const deleteVersionMutation = useMutation({
		mutationFn: (versionId: string) => adapter.history.deleteVersion(versionId),
		onSuccess: () => {
			toast.success('Version deleted', {
				description: 'The version has been deleted successfully',
			})
			queryClient.invalidateQueries({ queryKey: ['versions', schema, entryId] })
		},
		onError: (error: Error) => {
			toast.error(`Failed to delete version: ${error.message}`)
		},
	})

	// Normalize content data (handle array response)
	const normalizedData = Array.isArray(contentData)
		? contentData[0]
		: contentData

	// Auto-save hook
	const autoSave = useAutoSave({
		documentId: entryId,
		schema,
		locale: hasI18n ? currentLocale : undefined,
		enabled: !!entryId && !!schema,
		onSuccess: () => {
			// Invalidate locale statuses to update the status badge
			queryClient.invalidateQueries({
				queryKey: ['content', 'localeStatuses', schema, entryId],
			})
			// Invalidate the content item to get fresh metadata
			queryClient.invalidateQueries({
				predicate: (query) => {
					const key = query.queryKey
					return (
						Array.isArray(key) &&
						key[0] === 'content' &&
						key[1] === 'item' &&
						key[2] === schema &&
						key[3] === entryId
					)
				},
			})
		},
	})

	// Handle form changes - trigger auto-save
	const handleFormChange = useCallback(
		(data: ContentData) => {
			autoSave.save(data)
		},
		[autoSave],
	)

	// Handle discard
	const handleDiscard = useCallback(() => {
		navigate(`/content-manager/${schema}`)
	}, [navigate, schema])

	// Handle publish
	const handlePublish = useCallback(() => {
		publishContent(
			{
				schema,
				documentId: entryId,
				options: hasI18n ? { locale: currentLocale } : undefined,
			},
			{
				onSuccess: () => {
					toast.success('Published successfully', {
						description: hasI18n
							? `${schemaDisplayName} (${currentLocale}) was published`
							: undefined,
					})
					// Invalidate locale statuses to update the badge
					queryClient.invalidateQueries({
						queryKey: ['content', 'localeStatuses', schema, entryId],
					})
					// Invalidate content item to refresh metadata
					queryClient.invalidateQueries({
						predicate: (query) => {
							const key = query.queryKey
							return (
								Array.isArray(key) &&
								key[0] === 'content' &&
								key[1] === 'item' &&
								key[2] === schema &&
								key[3] === entryId
							)
						},
					})
				},
				onError: (error) => {
					toast.error(error.message || 'Failed to publish')
				},
			},
		)
	}, [
		publishContent,
		schema,
		entryId,
		hasI18n,
		currentLocale,
		schemaDisplayName,
		queryClient,
	])

	// Handle unpublish
	const handleUnpublish = useCallback(() => {
		unpublishContent(
			{
				schema,
				documentId: entryId,
				locale: hasI18n ? currentLocale : undefined,
			},
			{
				onSuccess: () => {
					toast.success('Unpublished successfully', {
						description: hasI18n
							? `${schemaDisplayName} (${currentLocale}) was unpublished`
							: undefined,
					})
					// Invalidate locale statuses to update the badge
					queryClient.invalidateQueries({
						queryKey: ['content', 'localeStatuses', schema, entryId],
					})
					// Invalidate content item to refresh metadata
					queryClient.invalidateQueries({
						predicate: (query) => {
							const key = query.queryKey
							return (
								Array.isArray(key) &&
								key[0] === 'content' &&
								key[1] === 'item' &&
								key[2] === schema &&
								key[3] === entryId
							)
						},
					})
				},
				onError: (error) => {
					toast.error(error.message || 'Failed to unpublish')
				},
			},
		)
	}, [
		unpublishContent,
		schema,
		entryId,
		hasI18n,
		currentLocale,
		schemaDisplayName,
		queryClient,
	])

	// Handle add locale
	const handleAddLocale = useCallback(
		(locale: string) => {
			// Copy current item data as initial content (strip system fields)
			const {
				_id,
				id,
				documentId: _docId,
				locale: _locale,
				status: _status,
				createdAt: _createdAt,
				updatedAt: _updatedAt,
				publishedAt: _publishedAt,
				createdBy: _createdBy,
				updatedBy: _updatedBy,
				__v,
				...userData
			} = normalizedData || {}

			addLocale(
				{
					schema,
					documentId: entryId,
					locale,
					data: userData as Partial<ContentData>,
				},
				{
					onSuccess: () => {
						toast.success('Locale added', {
							description: `${locale} translation was created`,
						})
						setCurrentLocale(locale)
					},
					onError: (error) => {
						toast.error(error.message || 'Failed to add locale')
					},
				},
			)
		},
		[addLocale, schema, entryId, normalizedData],
	)

	const isLoading = isSchemaLoading || isContentLoading
	const isMutating = isPublishing || isUnpublishing || isAddingLocale

	// Display status based on effective status
	const displayStatus = hasVersioning ? effectiveStatus : undefined

	// Build more menu items
	const moreMenuItems = useMemo(() => {
		const items: {
			label: string
			onClick: () => void
			variant?: 'destructive'
		}[] = []
		if (hasVersioning && currentLocaleStatus?.hasPublished) {
			items.push({
				label: 'Unpublish',
				onClick: handleUnpublish,
				variant: 'destructive',
			})
		}
		return items
	}, [hasVersioning, currentLocaleStatus, handleUnpublish])

	// Loading state
	if (isLoading) {
		return (
			<div className="flex-1 flex flex-col min-w-0 bg-white h-full relative">
				<header className="shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-md z-20 sticky top-0">
					<div className="px-8 py-4 flex items-center justify-between">
						<Skeleton className="h-8 w-48" />
						<div className="flex items-center gap-3">
							<Skeleton className="h-9 w-20" />
							<Skeleton className="h-9 w-20" />
						</div>
					</div>
				</header>
				<div className="flex-1 p-8">
					<div className="space-y-6">
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-32 w-full" />
						<Skeleton className="h-12 w-full" />
					</div>
				</div>
			</div>
		)
	}

	// Error state
	if (contentError || !schemaMetadata || 'error' in schemaMetadata) {
		return (
			<div className="flex-1 flex flex-col min-w-0 bg-white h-full relative">
				<header className="shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-md z-20 sticky top-0">
					<div className="px-8 py-4 flex items-center justify-between">
						<h1 className="text-3xl font-medium text-gray-900 tracking-tight">
							{schemaDisplayName}
						</h1>
						<Button variant="outline" onClick={handleDiscard}>
							Back to List
						</Button>
					</div>
				</header>
				<div className="flex-1 flex items-center justify-center p-8">
					<div className="text-center">
						<p className="text-gray-500 mb-4">
							{contentError?.message || 'Failed to load content'}
						</p>
						<Button onClick={() => window.location.reload()}>Retry</Button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex-1 flex flex-col min-w-0 bg-white h-full relative">
			{/* Content Header with locale selector, auto-save status, and publish button */}
			<ContentHeader
				basePath={`/content-manager/${schema}/${entryId}`}
				title={schemaDisplayName}
				status={displayStatus as 'draft' | 'published' | undefined}
				lastEdited={normalizedData?.updatedAt}
				tabs={[
					{ label: 'Edit', to: '' },
					{ label: 'Versions', to: 'versions' },
					{ label: 'API', to: 'api' },
				]}
				onDiscard={handleDiscard}
				onPublish={hasVersioning ? handlePublish : undefined}
				isPublishing={isPublishing}
				autoSaveStatus={{
					isSaving: autoSave.isSaving,
					lastSaved: autoSave.lastSaved,
					error: autoSave.error,
				}}
				localeProps={
					hasI18n
						? {
								currentLocale,
								locales: availableLocales,
								localeStatuses,
								onLocaleChange: setCurrentLocale,
								onAddLocale: handleAddLocale,
								disabled: isMutating,
							}
						: undefined
				}
				moreMenuItems={moreMenuItems.length > 0 ? moreMenuItems : undefined}
			/>

			{/* Info bar when editing published content (will create draft on save) */}
			{hasVersioning &&
				!currentLocaleStatus?.hasDraft &&
				currentLocaleStatus?.hasPublished && (
					<div className="px-6 py-2 border-b border-amber-200 bg-amber-50 flex items-center gap-2">
						<span className="text-xs text-amber-700">
							Editing published content. Changes will be saved as a new draft.
						</span>
					</div>
				)}

				{/* Content Body */}
			<div className="flex-1 flex overflow-hidden bg-gray-50/50">
				{/* VIEW: EDIT */}
				{currentView === 'edit' && (
					<FormBuilder
						schema={schemaMetadata}
						initialValues={normalizedData}
						onChange={handleFormChange}
						metadata={{
							createdAt: normalizedData?.createdAt,
							updatedAt: normalizedData?.updatedAt,
							publishedAt: normalizedData?.publishedAt,
						}}
						renderSidebar={({
							relationshipFields,
							sidePanelFields,
							renderField,
							metadata,
						}) => (
							<RelationsAndMetadataPanel
								relationshipFields={relationshipFields}
								sidePanelFields={sidePanelFields}
								renderField={renderField}
								metadata={metadata}
							/>
						)}
					/>
				)}

				{/* VIEW: VERSIONS */}
				{currentView === 'versions' && (
					<>
						<div className="flex-1 overflow-y-auto p-8">
							<div>
								<Card className="gap-0">
									{/* Card Header */}
									<div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
										<h2 className="text-sm font-semibold text-gray-900">Version History</h2>
										<span className="text-xs text-gray-500">{versions?.length ?? 0} versions found</span>
									</div>

									{/* Version Items - Divided List */}
									<div className="divide-y divide-gray-100">
										{versions && versions.length > 0 ? (
											(() => {
												const sortedVersions = [...versions].sort(
													(a, b) =>
														new Date(b.createdAt).getTime() -
														new Date(a.createdAt).getTime(),
												)
												return sortedVersions.map((version, index) => {
													const previousVersion = sortedVersions[index + 1] as
														| VersionWithData
														| undefined
													const versionWithData = version as VersionWithData
													const changedFields =
														versionWithData.data && previousVersion?.data
															? getChangedFields(
																	versionWithData.data,
																	previousVersion.data,
																)
															: []
													const isDraft = version.status === 'draft'

													const getVersionTitle = () => {
														if (isDraft) return 'Current Draft'
														if (index === sortedVersions.length - 1)
															return 'Initial Creation'
														return `${version.status.charAt(0).toUpperCase() + version.status.slice(1)} Version`
													}

													return (
														<div
															key={version.versionId}
															className="p-6 flex gap-4 hover:bg-gray-50 transition-colors group"
														>
															{/* Status indicator circle */}
															<div className="shrink-0 mt-1">
																<div
																	className={cn(
																		'w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white group-hover:ring-gray-50',
																		isDraft
																			? 'bg-yellow-100 text-yellow-700'
																			: 'bg-gray-100 text-gray-500',
																	)}
																>
																	{isDraft ? (
																		<Edit3 className="w-4 h-4" />
																	) : (
																		<Clock className="w-4 h-4" />
																	)}
																</div>
															</div>

															{/* Content */}
															<div className="flex-1">
																<div className="flex items-center justify-between mb-1">
																	<p className="text-sm font-medium text-gray-900">
																		{getVersionTitle()}
																	</p>
																	<Badge
																		variant="outline"
																		className={cn(
																			isDraft &&
																				'bg-yellow-50 text-yellow-700 border-yellow-600/20',
																			version.status === 'published' &&
																				'bg-emerald-50 text-emerald-700 border-emerald-600/20',
																			version.status === 'archived' &&
																				'bg-gray-50 text-gray-600 border-gray-300',
																		)}
																	>
																		{isDraft ? 'Draft' : version.status.charAt(0).toUpperCase() + version.status.slice(1)}
																	</Badge>
																</div>
																<p className="text-sm text-gray-500 mb-3">
																	{version.createdBy && (
																		<>
																			Edited by{' '}
																			<span className="text-gray-900 font-medium">
																				{version.createdBy}
																			</span>{' '}
																		</>
																	)}
																	{formatDistanceToNow(
																		new Date(version.createdAt),
																		{ addSuffix: true },
																	)}
																</p>
																{changedFields.length > 0 && (
																	<div className="text-xs text-gray-400 font-mono bg-gray-50 inline-block px-2 py-1 rounded border border-gray-200">
																		Changes: {changedFields.slice(0, 3).map(c => c.split(':')[0]).join(', ')}
																		{changedFields.length > 3 && ` +${changedFields.length - 3} more`}
																	</div>
																)}
															</div>

															{/* Actions */}
															<div className="flex gap-2 shrink-0">
																{isDraft && (
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={() =>
																			publishVersionMutation.mutate(
																				version.versionId,
																			)
																		}
																		disabled={publishVersionMutation.isPending}
																	>
																		{publishVersionMutation.isPending
																			? 'Publishing...'
																			: 'Publish'}
																	</Button>
																)}
																{version.status === 'published' && (
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={() =>
																			archiveVersionMutation.mutate(
																				version.versionId,
																			)
																		}
																		disabled={archiveVersionMutation.isPending}
																	>
																		{archiveVersionMutation.isPending
																			? 'Archiving...'
																			: 'Archive'}
																	</Button>
																)}
																{version.status === 'archived' && (
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={() =>
																			restoreVersionMutation.mutate(
																				version.versionId,
																			)
																		}
																		disabled={restoreVersionMutation.isPending}
																	>
																		{restoreVersionMutation.isPending
																			? 'Restoring...'
																			: 'Restore'}
																	</Button>
																)}
															</div>
														</div>
													)
												})
											})()
										) : (
											<div className="p-6 text-center text-gray-500">
												No version history available
											</div>
										)}
									</div>
								</Card>
							</div>
						</div>
						<RelationsAndMetadataPanel
							showRelations={false}
							metadata={{
								createdAt: normalizedData?.createdAt,
								updatedAt: normalizedData?.updatedAt,
								publishedAt: normalizedData?.publishedAt,
							}}
						/>
					</>
				)}

				{/* VIEW: API */}
				{currentView === 'api' && (
					<>
						<div className="flex-1 overflow-y-auto p-8">
							{(() => {
								const apiBaseUrl = config.apiBaseUrl || 'http://localhost:3000'

								const getMethodBadgeClass = (method: string) => {
									switch (method) {
										case 'GET':
											return 'bg-green-100 text-green-700'
										case 'POST':
											return 'bg-blue-100 text-blue-700'
										case 'PUT':
											return 'bg-amber-100 text-amber-700'
										case 'DELETE':
											return 'bg-red-100 text-red-700'
										default:
											return 'bg-gray-100 text-gray-700'
									}
								}

								const copyToClipboard = (text: string, key: string) => {
									navigator.clipboard.writeText(text).then(() => {
										setCopied({ ...copied, [key]: true })
										setTimeout(() => {
											setCopied((prev) => ({ ...prev, [key]: false }))
										}, 2000)
									})
								}

								const endpoints = [
									{
										id: 'get-all',
										name: 'Get All',
										method: 'GET',
										path: `/api/${schema}`,
										description: 'Retrieve all entries',
										code: `fetch('${apiBaseUrl}/content/${schema}${selectedApiLocale && selectedApiLocale !== 'none' ? `?locale=${selectedApiLocale}` : ''}', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
									},
									{
										id: 'get-single',
										name: 'Get By ID',
										method: 'GET',
										path: `/api/${schema}/:id`,
										description: 'Retrieve a single entry',
										code: `fetch('${apiBaseUrl}/content/${schema}/${entryId}${selectedApiLocale && selectedApiLocale !== 'none' ? `?locale=${selectedApiLocale}` : ''}', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
									},
									{
										id: 'create',
										name: 'Create',
										method: 'POST',
										path: `/api/${schema}`,
										description: 'Create a new entry',
										code: `const newItem = {
  // Add your fields here
};

fetch('${apiBaseUrl}/content/${schema}', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(newItem)
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
									},
									{
										id: 'update',
										name: 'Update',
										method: 'PUT',
										path: `/api/${schema}/:id`,
										description: 'Update an entry',
										code: `const updatedItem = {
  // Add updated fields here
};

fetch('${apiBaseUrl}/content/${schema}/${entryId}${selectedApiLocale && selectedApiLocale !== 'none' ? `?locale=${selectedApiLocale}` : ''}', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(updatedItem)
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
									},
									{
										id: 'delete',
										name: 'Delete',
										method: 'DELETE',
										path: `/api/${schema}/:id`,
										description: 'Delete an entry',
										code: `fetch('${apiBaseUrl}/content/${schema}/${entryId}', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
									},
								]

								const activeEndpointData = endpoints.find(
									(e) => e.id === activeEndpoint,
								)

								return (
									<div className="h-full flex flex-col">
										<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
											{/* Left Column: Endpoints */}
											<div className="space-y-6">
												{/* Locale Selector */}
												{availableLocales.length > 0 && (
													<div className="flex items-center gap-2">
														<Globe className="h-4 w-4 text-gray-400" />
														<Select
															value={selectedApiLocale}
															onValueChange={setSelectedApiLocale}
														>
															<SelectTrigger className="w-full h-8 text-xs">
																<SelectValue placeholder="Select locale" />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="none" className="text-xs">
																	No locale (default)
																</SelectItem>
																{availableLocales.map((locale) => (
																	<SelectItem
																		key={locale.code}
																		value={locale.code}
																		className="text-xs"
																	>
																		{locale.name} ({locale.code})
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</div>
												)}

												{/* Endpoints Card */}
												<Card>
													<CardContent className="p-6">
														<h3 className="text-sm font-semibold text-gray-900 mb-4">
															Endpoints
														</h3>
														<div className="space-y-3">
															{endpoints.map((endpoint) => (
																<button
																	type="button"
																	key={endpoint.id}
																	onClick={() => setActiveEndpoint(endpoint.id)}
																	className={cn(
																		'group p-3 rounded-lg border transition-all cursor-pointer text-left w-full',
																		activeEndpoint === endpoint.id
																			? 'border-blue-200 bg-blue-50/50'
																			: 'border-gray-200 hover:border-gray-300',
																	)}
																>
																	<div className="flex items-center gap-2 mb-1">
																		<span
																			className={cn(
																				'text-[10px] font-bold px-1.5 py-0.5 rounded',
																				getMethodBadgeClass(endpoint.method),
																			)}
																		>
																			{endpoint.method === 'DELETE' ? 'DEL' : endpoint.method}
																		</span>
																		<span className="text-xs font-mono text-gray-600">
																			{endpoint.path}
																		</span>
																	</div>
																	<p className="text-xs text-gray-500">
																		{endpoint.description}
																	</p>
																</button>
															))}
														</div>
													</CardContent>
												</Card>

												{/* Auth Info Box */}
												<div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
													<div className="flex items-start gap-3">
														<Info className="w-5 h-5 text-blue-600 mt-0.5" />
														<div>
															<p className="text-sm font-medium text-blue-900">
																Authentication Required
															</p>
															<p className="text-xs text-blue-700 mt-1 leading-relaxed">
																Include your API token in the header:{' '}
																<br />
																<code className="bg-blue-100 px-1 py-0.5 rounded text-blue-800">
																	Authorization: Bearer YOUR_TOKEN
																</code>
															</p>
														</div>
													</div>
												</div>
											</div>

											{/* Right Column: Code Preview */}
											<div className="lg:col-span-2 bg-gray-900 rounded-xl shadow-lg border border-gray-800 flex flex-col overflow-hidden h-[500px]">
												<div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950">
													<span className="text-xs font-medium text-gray-400">
														{activeEndpointData?.name} - Example Request
														{selectedApiLocale &&
															selectedApiLocale !== 'none' && (
																<span className="ml-2 text-gray-500">
																	(locale: {selectedApiLocale})
																</span>
															)}
													</span>
													<Button
														variant="ghost"
														size="sm"
														className="text-gray-400 hover:text-white"
														onClick={() =>
															activeEndpointData &&
															copyToClipboard(
																activeEndpointData.code,
																activeEndpointData.id,
															)
														}
													>
														{activeEndpointData &&
														copied[activeEndpointData.id] ? (
															<>
																<Check className="w-3 h-3 mr-1" />
																Copied!
															</>
														) : (
															<>
																<Copy className="w-3 h-3 mr-1" />
																Copy
															</>
														)}
													</Button>
												</div>
												<div className="flex-1 overflow-auto p-4 font-mono text-sm">
													<pre className="text-gray-300">
														<code>{activeEndpointData?.code}</code>
													</pre>
												</div>
											</div>
										</div>
									</div>
								)
							})()}
						</div>
						<RelationsAndMetadataPanel
							showRelations={false}
							metadata={{
								createdAt: normalizedData?.createdAt,
								updatedAt: normalizedData?.updatedAt,
								publishedAt: normalizedData?.publishedAt,
							}}
						/>
					</>
				)}
			</div>
		</div>
	)
}
