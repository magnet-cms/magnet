import { SchemaMetadata } from '@magnet/common'
import { Button, Separator, Spinner } from '@magnet/ui/components'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FormBuilder } from '~/components/FormBuilder'
import { Head } from '~/components/Head'
import { LocaleSwitcher, type LocaleOption } from '~/components/LocaleSwitcher'
import { StatusIndicator } from '~/components/StatusIndicator'
import { useAdapter } from '~/core/provider/MagnetProvider'
import { useContentManager } from '~/hooks/useContentManager'
import type { ContentData, LocaleStatus } from '~/core/adapters/types'

const ContentManagerViewerEdit = () => {
	const { id: documentId, schema: schemaName } = useParams()
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const adapter = useAdapter()
	const isCreating = !documentId || documentId === 'create'

	// State for locale and status
	const [currentLocale, setCurrentLocale] = useState('en')
	const [currentStatus, setCurrentStatus] = useState<'draft' | 'published'>('draft')

	// Get schema metadata and name information
	const contentManager = useContentManager()
	if (!contentManager) return <Spinner />

	const { name, schemaMetadata } = contentManager
	const schemaOptions = schemaMetadata?.options
	const hasI18n = schemaOptions?.i18n !== false
	const hasVersioning = schemaOptions?.versioning !== false

	// Fetch available locales from settings
	const { data: localesConfig } = useQuery({
		queryKey: ['settings', 'locales'],
		queryFn: () => adapter.settings.getLocales(),
		enabled: hasI18n,
	})

	// Convert configured locales to LocaleOption format
	const availableLocales: LocaleOption[] = useMemo(() => {
		if (!localesConfig) return [{ code: 'en', name: 'English' }]
		return localesConfig.configured.map(code => {
			const locale = localesConfig.available.find(l => l.value === code)
			return { code, name: locale?.key ?? code }
		})
	}, [localesConfig])

	// Fetch locale statuses for the document (only if i18n is enabled)
	const { data: localeStatuses } = useQuery({
		queryKey: ['content', schemaName, documentId, 'locales'],
		queryFn: () => adapter.content.getLocaleStatuses(name.key, documentId as string),
		enabled: !isCreating && !!documentId && hasI18n,
	})

	// Fetch item if editing
	const { data: item, isLoading: isLoadingItem } = useQuery({
		queryKey: ['content', schemaName, documentId, hasI18n ? currentLocale : undefined, hasVersioning ? currentStatus : undefined],
		queryFn: () =>
			adapter.content.get<ContentData>(name.key, documentId as string, {
				...(hasI18n && { locale: currentLocale }),
				...(hasVersioning && { status: currentStatus }),
			}),
		enabled: !isCreating && !!documentId,
	})

	// Fetch versions for the current locale (only if versioning is enabled)
	const { data: versions } = useQuery({
		queryKey: ['content', schemaName, documentId, 'versions', currentLocale],
		queryFn: () =>
			adapter.content.getVersions(name.key, documentId as string, currentLocale),
		enabled: !isCreating && !!documentId && hasVersioning,
	})

	// Create mutation
	const createMutation = useMutation({
		mutationFn: (data: ContentData) =>
			adapter.content.create<ContentData & { documentId?: string; id?: string }>(name.key, data, {
				...(hasI18n && { locale: currentLocale }),
			}),
		onSuccess: (data) => {
			toast.success('Content created', {
				description: `${name.title} was created successfully`,
			})
			queryClient.invalidateQueries({ queryKey: ['content', schemaName] })
			// Use documentId if available (i18n/versioning enabled), otherwise use id
			const itemId = data.documentId || data.id
			navigate(`/content-manager/${name.key}/${itemId}`)
		},
		onError: (error) => {
			toast.error(`Failed to create ${name.title}: ${error.message}`)
		},
	})

	// Update mutation
	const updateMutation = useMutation({
		mutationFn: (data: ContentData) =>
			adapter.content.update(name.key, documentId as string, data, {
				...(hasI18n && { locale: currentLocale }),
				...(hasVersioning && { status: currentStatus }),
			}),
		onSuccess: () => {
			toast.success('Content updated', {
				description: `${name.title} was updated successfully`,
			})
			queryClient.invalidateQueries({
				queryKey: ['content', schemaName, documentId],
			})
		},
		onError: (error) => {
			toast.error(`Failed to update ${name.title}: ${error.message}`)
		},
	})

	// Publish mutation (only used if versioning is enabled)
	const publishMutation = useMutation({
		mutationFn: () =>
			adapter.content.publish(name.key, documentId as string, {
				...(hasI18n && { locale: currentLocale }),
			}),
		onSuccess: () => {
			toast.success('Content published', {
				description: `${name.title} (${currentLocale}) was published successfully`,
			})
			queryClient.invalidateQueries({
				queryKey: ['content', schemaName, documentId],
			})
		},
		onError: (error) => {
			toast.error(`Failed to publish: ${error.message}`)
		},
	})

	// Unpublish mutation
	const unpublishMutation = useMutation({
		mutationFn: () =>
			adapter.content.unpublish(name.key, documentId as string, currentLocale),
		onSuccess: () => {
			toast.success('Content unpublished', {
				description: `${name.title} (${currentLocale}) was unpublished`,
			})
			queryClient.invalidateQueries({
				queryKey: ['content', schemaName, documentId],
			})
			// Switch to draft view after unpublishing
			setCurrentStatus('draft')
		},
		onError: (error) => {
			toast.error(`Failed to unpublish: ${error.message}`)
		},
	})

	// Add locale mutation
	const addLocaleMutation = useMutation({
		mutationFn: (locale: string) =>
			adapter.content.addLocale(name.key, documentId as string, locale, {}),
		onSuccess: (_, locale) => {
			toast.success('Locale added', {
				description: `${locale} translation was created`,
			})
			queryClient.invalidateQueries({
				queryKey: ['content', schemaName, documentId],
			})
			setCurrentLocale(locale)
		},
		onError: (error) => {
			toast.error(`Failed to add locale: ${error.message}`)
		},
	})

	// Handler for form submission
	const handleSubmit = (data: ContentData) => {
		if (isCreating) {
			createMutation.mutate(data)
		} else {
			updateMutation.mutate(data)
		}
	}

	// Handle locale change
	const handleLocaleChange = (locale: string) => {
		setCurrentLocale(locale)
		// Reset to draft when changing locale
		setCurrentStatus('draft')
	}

	// Handle add locale
	const handleAddLocale = (locale: string) => {
		addLocaleMutation.mutate(locale)
	}

	// Get current locale status
	const currentLocaleStatus = localeStatuses?.[currentLocale] as LocaleStatus | undefined

	// Loading state
	if (!isCreating && isLoadingItem) {
		return <Spinner />
	}

	const isMutating =
		createMutation.isPending ||
		updateMutation.isPending ||
		publishMutation.isPending ||
		unpublishMutation.isPending

	return (
		<div className="flex flex-col gap-4 w-full">
			<Head
				title={isCreating ? `Create ${name.title}` : `Edit ${name.title}`}
				actions={
					<div className="flex items-center gap-2">
						{/* Cancel button */}
						<Button
							variant="outline"
							onClick={() => navigate(`/content-manager/${name.key}`)}
						>
							Cancel
						</Button>

						{/* Save button */}
						<Button
							disabled={isMutating}
							onClick={() => {
								const form = document.querySelector('form')
								if (form)
									form.dispatchEvent(
										new Event('submit', { cancelable: true, bubbles: true }),
									)
							}}
						>
							{createMutation.isPending || updateMutation.isPending
								? 'Saving...'
								: 'Save'}
						</Button>
					</div>
				}
			/>

			{/* Locale switcher and status indicator - only show if i18n or versioning is enabled */}
			{!isCreating && (hasI18n || hasVersioning) && (
				<div className="bg-card border rounded-md p-4 flex flex-wrap items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						{/* Locale selector - only show if i18n is enabled */}
						{hasI18n && (
							<LocaleSwitcher
								currentLocale={currentLocale}
								locales={availableLocales}
								localeStatuses={localeStatuses}
								onLocaleChange={handleLocaleChange}
								onAddLocale={handleAddLocale}
								disabled={isMutating || addLocaleMutation.isPending}
							/>
						)}

						{/* Status toggle - only show if versioning is enabled */}
						{hasVersioning && (
							<div className="flex items-center gap-2">
								<Button
									variant={currentStatus === 'draft' ? 'default' : 'outline'}
									size="sm"
									onClick={() => setCurrentStatus('draft')}
									disabled={!currentLocaleStatus?.hasDraft}
								>
									Draft
								</Button>
								<Button
									variant={currentStatus === 'published' ? 'default' : 'outline'}
									size="sm"
									onClick={() => setCurrentStatus('published')}
									disabled={!currentLocaleStatus?.hasPublished}
								>
									Published
								</Button>
							</div>
						)}
					</div>

					{/* Status indicator with publish/unpublish - only show if versioning is enabled */}
					{hasVersioning && (
						<StatusIndicator
							status={currentStatus}
							hasPublished={currentLocaleStatus?.hasPublished}
							onPublish={() => publishMutation.mutate()}
							onUnpublish={() => unpublishMutation.mutate()}
							isPublishing={publishMutation.isPending}
							isUnpublishing={unpublishMutation.isPending}
							disabled={isMutating}
						/>
					)}
				</div>
			)}

			{/* Version info - only show if versioning is enabled */}
			{!isCreating && hasVersioning && versions && versions.length > 0 && (
				<div className="text-sm text-muted-foreground">
					{versions.length} version(s){hasI18n ? ` for ${currentLocale}` : ''}
				</div>
			)}

			<Separator />

			{/* Content form */}
			<FormBuilder
				schema={schemaMetadata as SchemaMetadata}
				onSubmit={handleSubmit}
				initialValues={Array.isArray(item) ? item[0] : item}
			/>
		</div>
	)
}

export default ContentManagerViewerEdit
