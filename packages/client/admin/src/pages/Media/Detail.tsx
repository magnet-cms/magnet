import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
	Separator,
	Textarea,
} from '@magnet-cms/ui/components'
import {
	ArrowLeft,
	Calendar,
	Download,
	File,
	Folder,
	HardDrive,
	ImageIcon,
	Tag,
	Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '~/components/PageHeader'
import {
	useMedia,
	useMediaDelete,
	useMediaUpdate,
	useMediaUrl,
} from '~/hooks/useMedia'

const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

const formatDate = (dateString: string): string => {
	return new Date(dateString).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

const MediaDetail = () => {
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()
	const { data: media, isLoading } = useMedia(id || '')
	const updateMutation = useMediaUpdate()
	const deleteMutation = useMediaDelete()
	const { getUrl, getPreviewUrl } = useMediaUrl()

	const [alt, setAlt] = useState('')
	const [tags, setTags] = useState('')
	const [folder, setFolder] = useState('')
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [hasChanges, setHasChanges] = useState(false)

	// Initialize form with media data
	useEffect(() => {
		if (media) {
			setAlt(media.alt || '')
			setTags(media.tags?.join(', ') || '')
			setFolder(media.folder || '')
		}
	}, [media])

	// Track changes
	useEffect(() => {
		if (!media) return
		const currentAlt = media.alt || ''
		const currentTags = media.tags?.join(', ') || ''
		const currentFolder = media.folder || ''
		setHasChanges(
			alt !== currentAlt || tags !== currentTags || folder !== currentFolder,
		)
	}, [media, alt, tags, folder])

	const handleSave = useCallback(async () => {
		if (!id) return
		try {
			await updateMutation.mutateAsync({
				id,
				data: {
					alt: alt || undefined,
					tags: tags
						? tags
								.split(',')
								.map((t) => t.trim())
								.filter(Boolean)
						: undefined,
					folder: folder || undefined,
				},
			})
			toast.success('Media updated successfully')
			setHasChanges(false)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Update failed')
		}
	}, [id, alt, tags, folder, updateMutation])

	const handleDelete = useCallback(async () => {
		if (!id) return
		try {
			await deleteMutation.mutateAsync(id)
			toast.success('Media deleted successfully')
			navigate('/media')
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Delete failed')
		}
	}, [id, deleteMutation, navigate])

	const handleDownload = useCallback(() => {
		if (!media || !id) return
		const url = getUrl(id)
		const a = document.createElement('a')
		a.href = url
		a.download = media.originalFilename
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
	}, [media, id, getUrl])

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
			</div>
		)
	}

	if (!media) {
		return (
			<div className="flex flex-col items-center justify-center h-64">
				<p className="text-muted-foreground">Media not found</p>
				<Button
					variant="outline"
					className="mt-4"
					onClick={() => navigate('/media')}
				>
					Back to Media Library
				</Button>
			</div>
		)
	}

	const isImage = media.mimeType.startsWith('image/')

	return (
		<div className="flex flex-col w-full min-h-0">
			<PageHeader
				icon={ImageIcon}
				title={media.originalFilename}
				description={media.mimeType}
				actions={
					<div className="flex items-center gap-2">
						<Button variant="outline" onClick={() => navigate('/media')}>
							<ArrowLeft className="w-4 h-4 mr-2" />
							Back
						</Button>
						<Button variant="outline" onClick={handleDownload}>
							<Download className="w-4 h-4 mr-2" />
							Download
						</Button>
						<Button
							variant="destructive"
							onClick={() => setShowDeleteDialog(true)}
						>
							<Trash2 className="w-4 h-4 mr-2" />
							Delete
						</Button>
					</div>
				}
			/>

			<div className="flex-1 overflow-y-auto p-6">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Preview */}
					<Card>
						<CardHeader>
							<CardTitle>Preview</CardTitle>
						</CardHeader>
						<CardContent>
							{isImage ? (
								<img
									src={getPreviewUrl(media.id)}
									alt={media.alt || media.originalFilename}
									className="max-w-full h-auto rounded-lg border"
								/>
							) : (
								<div className="flex flex-col items-center justify-center h-64 bg-muted rounded-lg">
									<File className="w-16 h-16 text-muted-foreground" />
									<span className="mt-2 text-sm text-muted-foreground uppercase">
										{media.mimeType.split('/')[1]}
									</span>
								</div>
							)}

							{/* Original URL */}
							<div className="mt-4">
								<Label className="text-xs text-muted-foreground">
									File URL
								</Label>
								<Input
									value={id ? getUrl(id) : ''}
									readOnly
									className="mt-1 text-xs font-mono"
								/>
							</div>
						</CardContent>
					</Card>

					{/* Details & Edit */}
					<div className="space-y-6">
						{/* File Info */}
						<Card>
							<CardHeader>
								<CardTitle>File Information</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div className="flex items-center gap-2">
										<HardDrive className="w-4 h-4 text-muted-foreground" />
										<div>
											<p className="text-xs text-muted-foreground">Size</p>
											<p className="text-sm font-medium">
												{formatFileSize(media.size)}
											</p>
										</div>
									</div>

									{isImage && media.width && media.height && (
										<div className="flex items-center gap-2">
											<ImageIcon className="w-4 h-4 text-muted-foreground" />
											<div>
												<p className="text-xs text-muted-foreground">
													Dimensions
												</p>
												<p className="text-sm font-medium">
													{media.width} x {media.height}
												</p>
											</div>
										</div>
									)}

									<div className="flex items-center gap-2">
										<Calendar className="w-4 h-4 text-muted-foreground" />
										<div>
											<p className="text-xs text-muted-foreground">Uploaded</p>
											<p className="text-sm font-medium">
												{formatDate(media.createdAt)}
											</p>
										</div>
									</div>

									{media.folder && (
										<div className="flex items-center gap-2">
											<Folder className="w-4 h-4 text-muted-foreground" />
											<div>
												<p className="text-xs text-muted-foreground">Folder</p>
												<p className="text-sm font-medium">{media.folder}</p>
											</div>
										</div>
									)}
								</div>

								{media.tags && media.tags.length > 0 && (
									<>
										<Separator />
										<div className="flex items-center gap-2 flex-wrap">
											<Tag className="w-4 h-4 text-muted-foreground" />
											{media.tags.map((tag) => (
												<Badge key={tag} variant="secondary">
													{tag}
												</Badge>
											))}
										</div>
									</>
								)}
							</CardContent>
						</Card>

						{/* Edit Metadata */}
						<Card>
							<CardHeader>
								<CardTitle>Edit Metadata</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<Label htmlFor="alt">Alt Text</Label>
									<Textarea
										id="alt"
										value={alt}
										onChange={(e) => setAlt(e.target.value)}
										placeholder="Describe this image for accessibility"
										className="mt-1"
									/>
								</div>

								<div>
									<Label htmlFor="tags">Tags</Label>
									<Input
										id="tags"
										value={tags}
										onChange={(e) => setTags(e.target.value)}
										placeholder="tag1, tag2, tag3"
										className="mt-1"
									/>
									<p className="text-xs text-muted-foreground mt-1">
										Separate tags with commas
									</p>
								</div>

								<div>
									<Label htmlFor="folder">Folder</Label>
									<Input
										id="folder"
										value={folder}
										onChange={(e) => setFolder(e.target.value)}
										placeholder="e.g., images/products"
										className="mt-1"
									/>
								</div>

								<Button
									onClick={handleSave}
									disabled={!hasChanges || updateMutation.isPending}
									className="w-full"
								>
									{updateMutation.isPending ? 'Saving...' : 'Save Changes'}
								</Button>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>

			{/* Delete Confirmation Dialog */}
			<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete File</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete "{media.originalFilename}"? This
							action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowDeleteDialog(false)}
						>
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
		</div>
	)
}

export default MediaDetail
