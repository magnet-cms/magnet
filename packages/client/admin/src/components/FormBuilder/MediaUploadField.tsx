import { SchemaProperty } from '@magnet-cms/common'
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@magnet-cms/ui/components'
import { cn } from '@magnet-cms/ui/lib'
import { capitalize } from '@magnet-cms/utils'
import {
	CloudUpload,
	File,
	FileText,
	Film,
	ImageIcon,
	Music,
	X,
} from 'lucide-react'
import { ReactElement, useCallback, useEffect, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { toast } from 'sonner'
import type { MediaItem } from '~/core/adapters/types'
import { useAdapter } from '~/core/provider/MagnetProvider'
import { useMediaList, useMediaUpload, useMediaUrl } from '~/hooks/useMedia'

/**
 * Media upload field that handles file uploads and stores Media IDs
 * Renders as a single upload or multiple uploads based on isArray
 */
export function MediaUploadField(prop: SchemaProperty): ReactElement {
	const { name, isArray } = prop
	const formContext = useFormContext()
	const { watch, setValue, control } = formContext
	const adapter = useAdapter()
	const { getThumbnailUrl } = useMediaUrl()
	const uploadMutation = useMediaUpload()

	const [showMediaPicker, setShowMediaPicker] = useState(false)
	const [uploading, setUploading] = useState(false)

	// Get current value (Media ID or array of Media IDs)
	const currentValue = watch(name)

	// Fetch existing media items if IDs are set
	const mediaIds = isArray
		? Array.isArray(currentValue)
			? currentValue
			: []
		: currentValue
			? [currentValue]
			: []

	const { data: mediaData } = useMediaList({ limit: 1000 }) // Fetch all media for picker

	// Fetch individual media items by ID
	const [selectedMedia, setSelectedMedia] = useState<MediaItem[]>([])

	// Fetch selected media items by ID
	useEffect(() => {
		if (mediaIds.length === 0) {
			setSelectedMedia([])
			return
		}

		// Fetch media items by ID
		const fetchMedia = async () => {
			const items: MediaItem[] = []
			for (const id of mediaIds) {
				if (!id || typeof id !== 'string') continue
				try {
					const item = await adapter.media.get(id)
					if (item) {
						items.push(item)
					}
				} catch {
					// Media not found, skip
				}
			}
			setSelectedMedia(items)
		}

		fetchMedia()
	}, [mediaIds.join(','), adapter]) // Use join to avoid infinite loops

	const getFileIcon = (mimeType: string) => {
		if (mimeType.startsWith('image/')) return ImageIcon
		if (mimeType.startsWith('video/')) return Film
		if (mimeType.startsWith('audio/')) return Music
		if (mimeType.includes('pdf')) return FileText
		return File
	}

	const handleFileUpload = useCallback(
		async (files: File[]) => {
			if (files.length === 0) return

			setUploading(true)
			try {
				const uploadedMedia: MediaItem[] = []

				// Upload files one by one
				for (const file of files) {
					try {
						const result = await uploadMutation.mutateAsync({ file })
						uploadedMedia.push(result)
					} catch (error) {
						console.error(`Failed to upload ${file.name}:`, error)
						toast.error(`Failed to upload ${file.name}`)
					}
				}

				if (uploadedMedia.length === 0) {
					return
				}

				// Update form value with Media IDs
				if (isArray) {
					const currentIds = Array.isArray(currentValue) ? currentValue : []
					const newIds = uploadedMedia.map((m) => m.id)
					setValue(name, [...currentIds, ...newIds], { shouldValidate: true })
				} else {
					// Single upload - use the first uploaded file
					const firstItem = uploadedMedia[0]
					if (firstItem) {
						setValue(name, firstItem.id, { shouldValidate: true })
					}
				}

				toast.success(`Uploaded ${uploadedMedia.length} file(s)`)
			} catch (error) {
				toast.error(error instanceof Error ? error.message : 'Upload failed')
			} finally {
				setUploading(false)
			}
		},
		[uploadMutation, isArray, currentValue, name, setValue],
	)

	const handleRemoveMedia = useCallback(
		(mediaId: string) => {
			if (isArray) {
				const currentIds = Array.isArray(currentValue) ? currentValue : []
				const newIds = currentIds.filter((id) => id !== mediaId)
				setValue(name, newIds, { shouldValidate: true })
			} else {
				setValue(name, '', { shouldValidate: true })
			}
		},
		[isArray, currentValue, name, setValue],
	)

	const handleToggleMedia = useCallback(
		(mediaId: string) => {
			if (isArray) {
				const currentIds = Array.isArray(currentValue) ? currentValue : []
				const isSelected = currentIds.includes(mediaId)
				const newIds = isSelected
					? currentIds.filter((id) => id !== mediaId)
					: [...currentIds, mediaId]
				setValue(name, newIds, { shouldValidate: true })
			} else {
				// Single selection
				const currentId = currentValue
				if (currentId === mediaId) {
					// Deselect if already selected
					setValue(name, '', { shouldValidate: true })
				} else {
					setValue(name, mediaId, { shouldValidate: true })
					setShowMediaPicker(false)
				}
			}
		},
		[isArray, currentValue, name, setValue],
	)

	const handleFileInput = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files
			if (files && files.length > 0) {
				handleFileUpload(Array.from(files))
			}
			e.target.value = '' // Reset input
		},
		[handleFileUpload],
	)

	const availableMedia =
		mediaData?.items?.filter((item: MediaItem) => !mediaIds.includes(item.id)) ||
		[]

	return (
		<FormField
			name={name}
			control={control}
			render={() => (
				<FormItem className="space-y-4">
					<FormLabel>{capitalize(prop.ui?.label || prop.name)}</FormLabel>
					<FormControl>
						<div className="space-y-4">
							{/* Upload area */}
							<div className="relative border-2 border-dashed rounded-lg p-6 transition-colors hover:border-primary/50">
								<input
									type="file"
									multiple={isArray}
									accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip"
									onChange={handleFileInput}
									disabled={uploading}
									className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
								/>
								<div className="flex flex-col items-center justify-center gap-2 text-center pointer-events-none">
									<CloudUpload className="w-8 h-8 text-muted-foreground" />
									<div className="space-y-1">
										<p className="text-sm font-medium">
											{uploading
												? 'Uploading...'
												: 'Drag & drop files here, or click to select'}
										</p>
										<p className="text-xs text-muted-foreground">
											{isArray ? 'Multiple files allowed' : 'Single file'}
										</p>
									</div>
									{!uploading && (
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={(e) => {
												e.preventDefault()
												e.stopPropagation()
												setShowMediaPicker(true)
											}}
											className="pointer-events-auto z-20 relative"
										>
											Select from Library
										</Button>
									)}
								</div>
							</div>

							{/* Selected media preview */}
							{selectedMedia.length > 0 && (
								<div className="space-y-2">
									<div className="text-sm font-medium">
										Selected {capitalize(prop.name)} ({selectedMedia.length})
									</div>
									<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
										{selectedMedia.map((item) => {
											const FileIcon = getFileIcon(item.mimeType)
											const isImage = item.mimeType.startsWith('image/')

											return (
												<div
													key={item.id}
													className="relative group border rounded-lg overflow-hidden"
												>
													{isImage ? (
														<img
															src={getThumbnailUrl(item.id)}
															alt={item.alt || item.originalFilename}
															className="w-full h-32 object-cover"
														/>
													) : (
														<div className="w-full h-32 bg-muted flex items-center justify-center">
															<FileIcon className="w-8 h-8 text-muted-foreground" />
														</div>
													)}
													<button
														type="button"
														onClick={() => handleRemoveMedia(item.id)}
														className="absolute top-2 right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
													>
														<X className="w-4 h-4" />
													</button>
													<div className="p-2 bg-background">
														<p className="text-xs font-medium truncate">
															{item.originalFilename}
														</p>
													</div>
												</div>
											)
										})}
									</div>
								</div>
							)}

							{/* Media Library Picker Dialog */}
							<Dialog open={showMediaPicker} onOpenChange={setShowMediaPicker}>
								<DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
									<DialogHeader>
										<DialogTitle>Select Media</DialogTitle>
										<DialogDescription>
											Choose {isArray ? 'one or more' : 'a'} file
											{isArray ? 's' : ''} from your media library
										</DialogDescription>
									</DialogHeader>
									<div className="grid grid-cols-3 md:grid-cols-4 gap-4 py-4">
										{availableMedia.map((item) => {
											const FileIcon = getFileIcon(item.mimeType)
											const isImage = item.mimeType.startsWith('image/')
											const isSelected = mediaIds.includes(item.id)

											return (
												<button
													key={item.id}
													type="button"
													className={cn(
														'relative cursor-pointer border-2 rounded-lg overflow-hidden transition-all text-left',
														isSelected
															? 'border-primary bg-primary/5'
															: 'border-border hover:border-primary/50',
													)}
													onClick={() => handleToggleMedia(item.id)}
												>
													{isImage ? (
														<img
															src={getThumbnailUrl(item.id)}
															alt={item.alt || item.originalFilename}
															className="w-full h-24 object-cover"
														/>
													) : (
														<div className="w-full h-24 bg-muted flex items-center justify-center">
															<FileIcon className="w-6 h-6 text-muted-foreground" />
														</div>
													)}
													{isSelected && (
														<div className="absolute top-1 right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
															✓
														</div>
													)}
													<div className="p-2 bg-background">
														<p className="text-xs truncate">
															{item.originalFilename}
														</p>
													</div>
												</button>
											)
										})}
									</div>
									<DialogFooter>
										<Button
											variant="outline"
											onClick={() => setShowMediaPicker(false)}
										>
											{isArray ? 'Done' : 'Cancel'}
										</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>
						</div>
					</FormControl>
					{prop.ui?.description && (
						<FormDescription>{prop.ui.description}</FormDescription>
					)}
					<FormMessage />
				</FormItem>
			)}
		/>
	)
}
