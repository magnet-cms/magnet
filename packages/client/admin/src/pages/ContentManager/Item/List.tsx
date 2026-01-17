import {
	Badge,
	Button,
	DataTable,
	type DataTableColumn,
	type DataTableRowAction,
} from '@magnet-cms/ui/components'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@magnet-cms/ui/components'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ErrorState } from '~/components/ErrorState'
import { Head } from '~/components/Head'
import { LoadingState } from '~/components/LoadingState'
import { useAdapter } from '~/core/provider/MagnetProvider'
import { useContentManager } from '~/hooks/useContentManager'

interface ContentItem {
	id: string
	documentId?: string
	[key: string]: unknown
}

const ContentManagerList = () => {
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const adapter = useAdapter()
	const [itemToDelete, setItemToDelete] = useState<ContentItem | null>(null)
	const contentManager = useContentManager()

	// Get schema info - use safe defaults to avoid hooks violations
	const name = contentManager?.name
	const schemaMetadata = contentManager?.schemaMetadata
	const schemaOptions = schemaMetadata?.options

	// Reset query cache when schema changes to prevent data accumulation
	useEffect(() => {
		if (name?.key) {
			// Remove all previous list queries to prevent stale data accumulation
			queryClient.removeQueries({
				predicate: (query) => {
					const queryKey = query.queryKey
					// Remove all list queries except the current one
					return (
						queryKey[0] === 'content' &&
						queryKey[1] === 'list' &&
						queryKey[2] !== name.key
					)
				},
			})
		}
	}, [name?.key, queryClient])

	// Fetch content items - only enabled if we have a valid schema
	// Use both name.key and schema metadata to ensure cache separation between schemas
	// Default to showing only published documents when versioning is enabled (like Payload CMS)
	// This prevents duplicates when a document has both draft and published versions
	const {
		data: items,
		isLoading,
		error,
	} = useQuery({
		queryKey: [
			'content',
			'list',
			name?.key || '',
			schemaOptions?.versioning !== false ? 'published' : undefined,
		],
		queryFn: () =>
			adapter.content.list<ContentItem>(name?.key || '', {
				// Only filter by status if versioning is enabled
				// Default to 'published' to avoid showing both draft and published versions
				...(schemaOptions?.versioning !== false && { status: 'published' }),
			}),
		// Refetch on mount to ensure fresh data when navigating between schemas
		refetchOnMount: 'always',
		// Don't use stale data - always refetch when schema changes
		staleTime: 0,
		// Don't keep cached data in memory to prevent accumulation
		gcTime: 0,
		// Don't show placeholder data from previous queries
		placeholderData: undefined,
		enabled: !!name?.key, // Only fetch if we have a valid schema name
	})

	// Get visible properties (only those with UI defined) - computed before useMemo
	const visibleProperties =
		schemaMetadata?.properties?.filter(
			(prop) => prop.ui && prop.name !== 'id',
		) || []

	// Helper function to check if a value is empty
	const isEmpty = (value: unknown): boolean => {
		if (value === null || value === undefined) return true
		if (typeof value === 'string' && value.trim() === '') return true
		if (Array.isArray(value) && value.length === 0) return true
		if (typeof value === 'object' && Object.keys(value).length === 0)
			return true
		return false
	}

	// Helper function to create a column format function
	const createColumnFormat = (fieldType?: string, isRichText?: boolean) => {
		return (value: unknown) => {
			// Check if this is a rich text field - show badge instead of content
			if (isRichText || fieldType === 'richText') {
				// Always show badge for rich text fields (empty or not)
				return isEmpty(value) ? (
					<Badge variant="outline" className="text-muted-foreground">
						Empty
					</Badge>
				) : (
					<Badge variant="secondary" className="text-xs">
						Rich Text
					</Badge>
				)
			}

			// Show placeholder chip for empty values
			if (isEmpty(value)) {
				return (
					<Badge variant="outline" className="text-muted-foreground">
						Empty
					</Badge>
				)
			}

			// Handle arrays (like relationships)
			if (Array.isArray(value)) {
				return value.length > 0 ? (
					String(value.length)
				) : (
					<Badge variant="outline" className="text-muted-foreground">
						Empty
					</Badge>
				)
			}
			// Handle objects (like populated relationships)
			if (typeof value === 'object' && value !== null) {
				// If it has an id or name property, show that
				if ('name' in value && value.name) {
					return String(value.name)
				}
				if ('title' in value && value.title) {
					return String(value.title)
				}
				if ('id' in value && value.id) {
					return String(value.id)
				}
				// Otherwise show empty chip
				return (
					<Badge variant="outline" className="text-muted-foreground">
						Empty
					</Badge>
				)
			}
			// For regular values, show as string
			return String(value)
		}
	}

	// Transform items for the DataTable with typed columns
	// Memoize columns based on schema to prevent stale column definitions
	// IMPORTANT: This must be called BEFORE any early returns to follow Rules of Hooks
	const tableColumns: DataTableColumn<ContentItem>[] = useMemo(() => {
		// Always start with ID column
		// Try documentId first, then fall back to id
		const idColumn: DataTableColumn<ContentItem> = {
			type: 'text' as const,
			accessorKey: 'documentId',
			header: 'ID',
			format: (value: unknown, row: ContentItem) => {
				// Prefer documentId from the row, fallback to id
				const idValue = row.documentId || row.id || value
				return idValue ? (
					String(idValue)
				) : (
					<Badge variant="outline" className="text-muted-foreground">
						Empty
					</Badge>
				)
			},
		}

		const otherColumns: DataTableColumn<ContentItem>[] = []

		// Use schema properties with UI defined for columns
		if (visibleProperties.length > 0) {
			otherColumns.push(
				...visibleProperties.map((prop) => {
					const isRichText = prop.ui?.type === 'richText'
					const formatFn = createColumnFormat(prop.ui?.type, isRichText)
					return {
						type: 'text' as const,
						accessorKey: prop.name,
						header:
							prop.ui?.label ||
							prop.name.charAt(0).toUpperCase() +
								prop.name
									.slice(1)
									.replace(/([A-Z])/g, ' $1')
									.trim(),
						format: formatFn,
					}
				}),
			)
		} else if (items && items.length > 0) {
			// Fallback: derive columns from first item if schema properties not available
			otherColumns.push(
				...Object.keys(items[0] || {})
					.filter(
						(key) =>
							key !== 'id' &&
							key !== 'documentId' &&
							key !== '_id' &&
							key !== 'createdAt' &&
							key !== 'updatedAt' &&
							key !== 'publishedAt' &&
							key !== 'createdBy' &&
							key !== 'updatedBy' &&
							key !== 'status' &&
							key !== 'locale' &&
							key !== '__v',
					)
					.map((key) => {
						const formatFn = createColumnFormat()
						return {
							type: 'text' as const,
							accessorKey: key,
							header:
								key.charAt(0).toUpperCase() +
								key
									.slice(1)
									.replace(/([A-Z])/g, ' $1')
									.trim(),
							format: formatFn,
						}
					}),
			)
		}

		// Always return ID column first, then other columns
		return [idColumn, ...otherColumns]
	}, [visibleProperties, items])

	// Delete mutation - must be defined before early returns
	const deleteMutation = useMutation({
		mutationFn: (item: ContentItem) => {
			return adapter.content.delete(name?.key || '', item.documentId || item.id)
		},
		onSuccess: () => {
			if (name) {
				toast('Content deleted', {
					description: `${name.title} was deleted successfully`,
				})
				queryClient.invalidateQueries({
					queryKey: ['content', 'list', name.key],
				})
			}
			setItemToDelete(null)
		},
		onError: (error) => {
			if (name) {
				toast.error(`Failed to delete ${name.title}: ${error.message}`)
			} else {
				toast.error(`Failed to delete: ${error.message}`)
			}
		},
	})

	// Duplicate mutation - must be defined before early returns
	const duplicateMutation = useMutation({
		mutationFn: (item: ContentItem) => {
			// Create a new item by duplicating the existing one without the ID
			const { id, ...itemData } = item
			return adapter.content.create(name?.key || '', {
				...itemData,
				name: `${itemData.name || itemData.title || 'Copy'} (Copy)`,
			})
		},
		onSuccess: () => {
			if (name) {
				toast('Content duplicated', {
					description: `${name.title} was duplicated successfully`,
				})
				queryClient.invalidateQueries({
					queryKey: ['content', 'list', name.key],
				})
			}
		},
		onError: (error) => {
			if (name) {
				toast.error(`Failed to duplicate ${name.title}: ${error.message}`)
			} else {
				toast.error(`Failed to duplicate: ${error.message}`)
			}
		},
	})

	// Create empty document mutation - must be defined before early returns
	const createMutation = useMutation({
		mutationFn: () => adapter.content.createEmpty(name?.key || ''),
		onSuccess: (data) => {
			if (name?.key) {
				navigate(`/content-manager/${name.key}/${data.documentId}`)
			}
		},
		onError: (error) => {
			if (name) {
				toast.error(`Failed to create ${name.title}: ${error.message}`)
			} else {
				toast.error(`Failed to create: ${error.message}`)
			}
		},
	})

	// Now safe to do early returns after all hooks are called
	if (!contentManager) return <LoadingState />

	if (isLoading)
		return <LoadingState message={`Loading ${name?.title || 'content'}...`} />

	if (error)
		return (
			<ErrorState
				title={`Error loading ${name?.title || 'content'}`}
				message={error.message || 'Failed to fetch data. Please try again.'}
				onRetry={() => {
					if (name?.key) {
						queryClient.invalidateQueries({
							queryKey: ['content', 'list', name.key],
						})
					}
				}}
			/>
		)

	// Define row actions for the DataTable
	const rowActions: DataTableRowAction<ContentItem>[] = [
		{
			label: 'Edit',
			onSelect: (item) =>
				navigate(`/content-manager/${name?.key}/${item.documentId || item.id}`),
		},
		...(schemaOptions?.versioning !== false
			? [
					{
						label: 'Duplicate',
						onSelect: (item: ContentItem) => duplicateMutation.mutate(item),
					},
					{
						label: 'Versions',
						onSelect: (item: ContentItem) =>
							navigate(
								`/content-manager/${name?.key}/${item.documentId || item.id}/versions`,
							),
					},
				]
			: []),
		{
			label: 'Delete',
			onSelect: (item) => setItemToDelete(item),
			destructive: true,
		},
	]

	return (
		<div className="flex flex-col w-full min-h-0">
			<Head
				title={name?.title || ''}
				actions={
					<Button
						onClick={() => createMutation.mutate()}
						disabled={createMutation.isPending}
					>
						{createMutation.isPending ? 'Creating...' : `Create ${name?.title}`}
					</Button>
				}
			/>

			<div className="flex-1 overflow-y-auto p-6">
				<DataTable
					columns={tableColumns}
					data={items || []}
					options={{
						rowActions: {
							items: rowActions,
						},
					}}
					getRowId={(row) => row.documentId || row.id}
					enablePagination
					enableSorting
				/>
			</div>

			{/* Delete confirmation dialog */}
			<Dialog
				open={!!itemToDelete}
				onOpenChange={(open) => !open && setItemToDelete(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete {name?.title || ''}</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this{' '}
							{name?.title?.toLowerCase() || ''}? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setItemToDelete(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() =>
								itemToDelete && deleteMutation.mutate(itemToDelete)
							}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? 'Deleting...' : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

export default ContentManagerList
