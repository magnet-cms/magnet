import {
	Button,
	DataTable,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@magnet/ui/components'
import { Spinner } from '@magnet/ui/components'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@magnet/ui/components'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Edit, Globe, MoreHorizontal, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Head } from '~/components/Head'
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

	if (!contentManager) return <Spinner />

	const { name, schemaMetadata } = contentManager
	const schemaOptions = schemaMetadata?.options

	// Fetch content items
	const {
		data: items,
		isLoading,
		error,
	} = useQuery({
		queryKey: ['content', name.key],
		queryFn: () => adapter.content.list<ContentItem>(name.key),
	})

	// Delete mutation
	const deleteMutation = useMutation({
		mutationFn: (item: ContentItem) => {
			return adapter.content.delete(name.key, item.documentId || item.id)
		},
		onSuccess: () => {
			toast('Content deleted', {
				description: `${name.title} was deleted successfully`,
			})
			queryClient.invalidateQueries({ queryKey: ['content', name.key] })
			setItemToDelete(null)
		},
		onError: (error) => {
			toast.error(`Failed to delete ${name.title}: ${error.message}`)
		},
	})

	// Duplicate mutation
	const duplicateMutation = useMutation({
		mutationFn: (item: ContentItem) => {
			// Create a new item by duplicating the existing one without the ID
			const { id, ...itemData } = item
			return adapter.content.create(name.key, {
				...itemData,
				name: `${itemData.name || itemData.title || 'Copy'} (Copy)`,
			})
		},
		onSuccess: () => {
			toast('Content duplicated', {
				description: `${name.title} was duplicated successfully`,
			})
			queryClient.invalidateQueries({ queryKey: ['content', name.key] })
		},
		onError: (error) => {
			toast.error(`Failed to duplicate ${name.title}: ${error.message}`)
		},
	})

	// Create empty document mutation (for immediate redirect flow)
	const createMutation = useMutation({
		mutationFn: () => adapter.content.createEmpty(name.key),
		onSuccess: (data) => {
			navigate(`/content-manager/${name.key}/${data.documentId}`)
		},
		onError: (error) => {
			toast.error(`Failed to create ${name.title}: ${error.message}`)
		},
	})

	if (isLoading) return <Spinner />

	if (error)
		return (
			<div>
				Error loading {name.title}: {error.message}
			</div>
		)

	// Get visible properties (only those with UI defined)
	const visibleProperties = schemaMetadata?.properties?.filter(
		(prop) => prop.ui && prop.name !== 'id',
	) || []

	// Transform items for the DataTable with an actions column
	const tableColumns = [
		// Use schema properties with UI defined for columns
		...(visibleProperties.length > 0
			? visibleProperties.map((prop) => ({
					accessorKey: prop.name,
					header: prop.ui?.label ||
						prop.name.charAt(0).toUpperCase() +
						prop.name
							.slice(1)
							.replace(/([A-Z])/g, ' $1')
							.trim(),
				}))
			: items && items.length > 0
				? Object.keys(items[0] || {})
						.filter(
							(key) => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt',
						)
						.map((key) => ({
							accessorKey: key,
							header:
								key.charAt(0).toUpperCase() +
								key
									.slice(1)
									.replace(/([A-Z])/g, ' $1')
									.trim(),
						}))
				: []),

		// Actions column
		{
			id: 'actions',
			cell: ({ row }: { row: { original: ContentItem } }) => {
				const item = row.original

				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="h-8 w-8 p-0">
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={() =>
									navigate(`/content-manager/${name.key}/${item.documentId || item.id}`)
								}
							>
								<Edit className="mr-2 h-4 w-4" />
								<span>Edit</span>
							</DropdownMenuItem>
							{schemaOptions?.versioning !== false && (
								<DropdownMenuItem onClick={() => duplicateMutation.mutate(item)}>
									<Copy className="mr-2 h-4 w-4" />
									<span>Duplicate</span>
								</DropdownMenuItem>
							)}
							{schemaOptions?.versioning !== false && (
								<DropdownMenuItem
									onClick={() =>
										navigate(`/content-manager/${name.key}/${item.documentId || item.id}/versions`)
									}
								>
									<Globe className="mr-2 h-4 w-4" />
									<span>Versions</span>
								</DropdownMenuItem>
							)}
							<DropdownMenuItem
								onClick={() => setItemToDelete(item)}
								className="text-destructive focus:text-destructive"
							>
								<Trash2 className="mr-2 h-4 w-4" />
								<span>Delete</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)
			},
		},
	]

	return (
		<div className="flex flex-col w-full min-h-0">
			<Head
				title={name.title}
				actions={
					<Button
						onClick={() => createMutation.mutate()}
						disabled={createMutation.isPending}
					>
						{createMutation.isPending ? 'Creating...' : `Create ${name.title}`}
					</Button>
				}
			/>

			<div className="flex-1 overflow-y-auto p-6">
				<div className="rounded-md border">
					<DataTable columns={tableColumns} data={items || []} />
				</div>
			</div>

			{/* Delete confirmation dialog */}
			<Dialog
				open={!!itemToDelete}
				onOpenChange={(open) => !open && setItemToDelete(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete {name.title}</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this {name.title.toLowerCase()}?
							This action cannot be undone.
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
