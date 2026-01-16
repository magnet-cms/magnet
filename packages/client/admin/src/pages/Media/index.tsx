import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@magnet-cms/ui/components'
import { CloudUpload, Grid, List, Search, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '~/components/PageHeader'
import type { MediaItem, MediaQueryOptions } from '~/core/adapters/types'
import {
	useMediaDelete,
	useMediaDeleteMany,
	useMediaFolders,
	useMediaList,
	useMediaUploadMultiple,
} from '~/hooks/useMedia'
import { MediaGrid } from './components/MediaGrid'
import { MediaUploadZone } from './components/MediaUploadZone'

const MediaLibrary = () => {
	const navigate = useNavigate()

	// State
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
	const [selectedItems, setSelectedItems] = useState<string[]>([])
	const [searchQuery, setSearchQuery] = useState('')
	const [selectedFolder, setSelectedFolder] = useState<string>('')
	const [showUploadDialog, setShowUploadDialog] = useState(false)
	const [itemToDelete, setItemToDelete] = useState<MediaItem | null>(null)
	const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)

	// Query options
	const [queryOptions, setQueryOptions] = useState<MediaQueryOptions>({
		page: 1,
		limit: 24,
	})

	// Queries
	const { data: mediaData, isLoading } = useMediaList({
		...queryOptions,
		folder: selectedFolder || undefined,
		search: searchQuery || undefined,
	})
	const { data: folders } = useMediaFolders()

	// Mutations
	const uploadMutation = useMediaUploadMultiple()
	const deleteMutation = useMediaDelete()
	const deleteMany = useMediaDeleteMany()

	// Handlers
	const handleSearch = useCallback((value: string) => {
		setSearchQuery(value)
		setQueryOptions((prev) => ({ ...prev, page: 1 }))
	}, [])

	const handleFolderChange = useCallback((value: string) => {
		setSelectedFolder(value === 'all' ? '' : value)
		setQueryOptions((prev) => ({ ...prev, page: 1 }))
	}, [])

	const handleUpload = useCallback(
		async (files: File[]) => {
			try {
				await uploadMutation.mutateAsync({
					files,
					options: { folder: selectedFolder || undefined },
				})
				toast.success(`${files.length} file(s) uploaded successfully`)
				setShowUploadDialog(false)
			} catch (error) {
				toast.error(error instanceof Error ? error.message : 'Upload failed')
			}
		},
		[uploadMutation, selectedFolder],
	)

	const handleDelete = useCallback(async () => {
		if (!itemToDelete) return
		try {
			await deleteMutation.mutateAsync(itemToDelete.id)
			toast.success('File deleted successfully')
			setItemToDelete(null)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Delete failed')
		}
	}, [deleteMutation, itemToDelete])

	const handleBulkDelete = useCallback(async () => {
		try {
			const result = await deleteMany.mutateAsync(selectedItems)
			toast.success(`${result.deleted} file(s) deleted`)
			setSelectedItems([])
			setShowBulkDeleteDialog(false)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Bulk delete failed')
		}
	}, [deleteMany, selectedItems])

	const toggleSelection = useCallback((id: string) => {
		setSelectedItems((prev) =>
			prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
		)
	}, [])

	const handleView = useCallback(
		(item: MediaItem) => {
			navigate(`/media/${item.id}`)
		},
		[navigate],
	)

	return (
		<div className="flex flex-col w-full min-h-0">
			<PageHeader
				icon={CloudUpload}
				title="Media Library"
				description="Upload and manage your media files"
				actions={
					<div className="flex items-center gap-2">
						{selectedItems.length > 0 && (
							<Button
								variant="destructive"
								onClick={() => setShowBulkDeleteDialog(true)}
							>
								<Trash2 className="w-4 h-4 mr-2" />
								Delete ({selectedItems.length})
							</Button>
						)}
						<Button onClick={() => setShowUploadDialog(true)}>
							<CloudUpload className="w-4 h-4 mr-2" />
							Upload
						</Button>
					</div>
				}
			/>

			<div className="flex-1 overflow-y-auto p-6 space-y-4">
				{/* Filters */}
				<div className="flex items-center gap-4">
					<div className="relative flex-1 max-w-sm">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
						<Input
							placeholder="Search files..."
							value={searchQuery}
							onChange={(e) => handleSearch(e.target.value)}
							className="pl-9"
						/>
					</div>

					<Select
						value={selectedFolder || 'all'}
						onValueChange={handleFolderChange}
					>
						<SelectTrigger className="w-48">
							<SelectValue placeholder="All folders" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All folders</SelectItem>
							{folders?.map((folder) => (
								<SelectItem key={folder} value={folder}>
									{folder}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<div className="flex border rounded-md">
						<Button
							variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
							size="icon"
							onClick={() => setViewMode('grid')}
						>
							<Grid className="w-4 h-4" />
						</Button>
						<Button
							variant={viewMode === 'list' ? 'secondary' : 'ghost'}
							size="icon"
							onClick={() => setViewMode('list')}
						>
							<List className="w-4 h-4" />
						</Button>
					</div>
				</div>

				{/* Content */}
				{isLoading ? (
					<div className="flex items-center justify-center h-64">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
					</div>
				) : mediaData?.items.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
						<CloudUpload className="w-12 h-12 mb-4" />
						<p>No media files found</p>
						<Button
							variant="outline"
							className="mt-4"
							onClick={() => setShowUploadDialog(true)}
						>
							Upload your first file
						</Button>
					</div>
				) : (
					<MediaGrid
						items={mediaData?.items || []}
						selectedItems={selectedItems}
						onSelect={toggleSelection}
						onView={handleView}
						onDelete={(item) => setItemToDelete(item)}
						viewMode={viewMode}
					/>
				)}

				{/* Pagination */}
				{mediaData && mediaData.totalPages > 1 && (
					<div className="flex items-center justify-center gap-2 pt-4">
						<Button
							variant="outline"
							size="sm"
							disabled={queryOptions.page === 1}
							onClick={() =>
								setQueryOptions((prev) => ({
									...prev,
									page: (prev.page || 1) - 1,
								}))
							}
						>
							Previous
						</Button>
						<span className="text-sm text-muted-foreground">
							Page {mediaData.page} of {mediaData.totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							disabled={queryOptions.page === mediaData.totalPages}
							onClick={() =>
								setQueryOptions((prev) => ({
									...prev,
									page: (prev.page || 1) + 1,
								}))
							}
						>
							Next
						</Button>
					</div>
				)}
			</div>

			{/* Upload Dialog */}
			<Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Upload Files</DialogTitle>
						<DialogDescription>
							Drag and drop files or click to browse
						</DialogDescription>
					</DialogHeader>
					<MediaUploadZone
						onUpload={handleUpload}
						isUploading={uploadMutation.isPending}
					/>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog
				open={!!itemToDelete}
				onOpenChange={(open) => !open && setItemToDelete(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete File</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete "{itemToDelete?.originalFilename}
							"? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setItemToDelete(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? 'Deleting...' : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Bulk Delete Dialog */}
			<Dialog
				open={showBulkDeleteDialog}
				onOpenChange={setShowBulkDeleteDialog}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete {selectedItems.length} Files</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete these files? This action cannot be
							undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowBulkDeleteDialog(false)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleBulkDelete}
							disabled={deleteMany.isPending}
						>
							{deleteMany.isPending ? 'Deleting...' : 'Delete All'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

export default MediaLibrary
