import { SchemaMetadata } from '@magnet/common'
import { Button, Separator, Spinner } from '@magnet/ui/components'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FormBuilder } from '~/components/FormBuilder'
import { Head } from '~/components/Head'
import { useContentManager } from '~/hooks/useContentManager'
import { fetcher } from '~/lib/api'

// Define generic type for content data
type ContentData = Record<string, any>

const ContentManagerViewerEdit = () => {
	const { id, schema: schemaName } = useParams()
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const isCreating = !id || id === 'create'
	const [locale, setLocale] = useState<string | null>(null)
	const [version, setVersion] = useState<string | null>(null)

	// Get schema metadata and name information
	const contentManager = useContentManager()
	if (!contentManager) return <Spinner />

	const { name, schemaMetadata } = contentManager

	// Fetch item if editing
	const { data: item, isLoading: isLoadingItem } = useQuery({
		queryKey: ['content', schemaName, id, locale, version],
		queryFn: () => {
			let url = `/${name.key}s/${id}`
			const params = new URLSearchParams()

			if (locale) params.append('locale', locale)
			if (version) params.append('version', version)

			if (params.toString()) {
				url += `?${params.toString()}`
			}

			return fetcher<ContentData>(url)
		},
		enabled: !isCreating,
	})

	// Create mutation
	const createMutation = useMutation({
		mutationFn: (data: ContentData) => {
			return fetcher<ContentData>(`/${name.key}`, {
				method: 'POST',
				body: JSON.stringify(data),
			})
		},
		onSuccess: (data) => {
			toast('Content created', {
				description: `${name.title} was created successfully`,
			})
			queryClient.invalidateQueries({ queryKey: ['content', schemaName] })
			navigate(`/content-manager/${name.key}/${data.id}`)
		},
		onError: (error) => {
			toast.error(`Failed to create ${name.title}: ${error.message}`)
		},
	})

	// Update mutation
	const updateMutation = useMutation({
		mutationFn: (data: ContentData) => {
			let url = `/${name.key}/${id}`
			const params = new URLSearchParams()

			if (locale) params.append('locale', locale)
			if (version) params.append('version', version)

			if (params.toString()) {
				url += `?${params.toString()}`
			}

			return fetcher<ContentData>(url, {
				method: 'PUT',
				body: JSON.stringify(data),
			})
		},
		onSuccess: () => {
			toast('Content updated', {
				description: `${name.title} was updated successfully`,
			})
			queryClient.invalidateQueries({ queryKey: ['content', schemaName, id] })
		},
		onError: (error) => {
			toast.error(`Failed to update ${name.title}: ${error.message}`)
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

	// Locales that can be selected (hardcoded for now, should be fetched from API)
	const locales = [
		{ name: 'English', code: 'en' },
		{ name: 'Spanish', code: 'es' },
		{ name: 'French', code: 'fr' },
	]

	// Versions that can be selected (for edit mode)
	const { data: versions, isLoading: isLoadingVersions } = useQuery({
		queryKey: ['versions', schemaName, id],
		queryFn: () => {
			return fetcher<
				{ versionId: string; status: string; createdAt: string }[]
			>(`/history/versions/${id}?collection=${name.key}`)
		},
		enabled: !isCreating,
	})

	// Loading state
	if (isCreating ? false : isLoadingItem || isLoadingVersions) {
		return <Spinner />
	}

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
							disabled={createMutation.isPending || updateMutation.isPending}
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

			{/* Locale and version selectors */}
			{!isCreating && (
				<div className="bg-card border rounded-md p-4 flex flex-wrap gap-4">
					{/* Locale selector */}
					<div className="flex flex-col gap-1">
						<label htmlFor="locale-select" className="text-sm font-medium">
							Locale
						</label>
						<select
							id="locale-select"
							className="h-9 rounded-md border px-3 py-1"
							value={locale || ''}
							onChange={(e) => setLocale(e.target.value || null)}
						>
							<option value="">Default</option>
							{locales.map((loc) => (
								<option key={loc.code} value={loc.code}>
									{loc.name}
								</option>
							))}
						</select>
					</div>

					{/* Version selector */}
					<div className="flex flex-col gap-1">
						<label htmlFor="version-select" className="text-sm font-medium">
							Version
						</label>
						<select
							id="version-select"
							className="h-9 rounded-md border px-3 py-1"
							value={version || ''}
							onChange={(e) => setVersion(e.target.value || null)}
							disabled={!versions || versions.length === 0}
						>
							<option value="">Current</option>
							{versions?.map((ver) => (
								<option key={ver.versionId} value={ver.versionId}>
									{ver.status} - {new Date(ver.createdAt).toLocaleString()}
								</option>
							))}
						</select>
					</div>
				</div>
			)}

			<Separator />

			{/* Content form */}
			<FormBuilder
				schema={schemaMetadata as SchemaMetadata}
				onSubmit={handleSubmit}
				initialValues={item}
			/>
		</div>
	)
}

export default ContentManagerViewerEdit
