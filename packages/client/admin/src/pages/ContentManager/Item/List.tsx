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
import { useContentManager } from '~/hooks/useContentManager'
import { fetcher } from '~/lib/api'

interface ContentItem {
	id: string
	[key: string]: any
}

const ContentManagerList = () => {
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const [itemToDelete, setItemToDelete] = useState<ContentItem | null>(null)
	const contentManager = useContentManager()

	if (!contentManager) return <Spinner />

	const { name } = contentManager

	// Fetch content items
	const {
		data: items,
		isLoading,
		error,
	} = useQuery({
		queryKey: ['content', name.key],
		queryFn: () => fetcher<ContentItem[]>(`/${name.key}s`),
	})

	// Delete mutation
	const deleteMutation = useMutation({
		mutationFn: (id: string) => {
			return fetcher(`/${name.key}/${id}`, {
				method: 'DELETE',
			})
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
			return fetcher(`/${name.key}`, {
				method: 'POST',
				body: JSON.stringify({
					...itemData,
					name: `${itemData.name || itemData.title || 'Copy'} (Copy)`, // Add "Copy" to the name or title
				}),
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

	if (isLoading) return <Spinner />

	if (error)
		return (
			<div>
				Error loading {name.title}: {error.message}
			</div>
		)

	// Transform items for the DataTable with an actions column
	const tableColumns = [
		// Existing columns from items (if any)
		...(items && items.length > 0
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
									navigate(`/content-manager/${name.key}/${item.id}`)
								}
							>
								<Edit className="mr-2 h-4 w-4" />
								<span>Edit</span>
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => duplicateMutation.mutate(item)}>
								<Copy className="mr-2 h-4 w-4" />
								<span>Duplicate</span>
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() =>
									navigate(`/content-manager/${name.key}/${item.id}/versions`)
								}
							>
								<Globe className="mr-2 h-4 w-4" />
								<span>Versions</span>
							</DropdownMenuItem>
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
		<div className="w-full">
			<Head
				title={name.title}
				actions={
					<Button
						onClick={() => navigate(`/content-manager/${name.key}/create`)}
					>
						Create {name.title}
					</Button>
				}
			/>

			<div className="rounded-md border mt-4">
				<DataTable columns={tableColumns} data={items || []} />
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
								itemToDelete && deleteMutation.mutate(itemToDelete.id)
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
