import { cn } from '@magnet/ui/lib'
import { Check, File, FileText, Film, ImageIcon, Music } from 'lucide-react'
import type { MediaItem } from '~/core/adapters/types'
import { useMediaUrl } from '~/hooks/useMedia'

interface MediaGridProps {
	items: MediaItem[]
	selectedItems: string[]
	onSelect: (id: string) => void
	onView: (item: MediaItem) => void
	onDelete: (item: MediaItem) => void
	viewMode?: 'grid' | 'list'
}

const getFileIcon = (mimeType: string) => {
	if (mimeType.startsWith('image/')) return ImageIcon
	if (mimeType.startsWith('video/')) return Film
	if (mimeType.startsWith('audio/')) return Music
	if (mimeType.includes('pdf')) return FileText
	return File
}

const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

export const MediaGrid = ({
	items,
	selectedItems,
	onSelect,
	onView,
	viewMode = 'grid',
}: MediaGridProps) => {
	const { getThumbnailUrl } = useMediaUrl()

	if (viewMode === 'list') {
		return (
			<div className="space-y-2">
				{items.map((item) => {
					const isSelected = selectedItems.includes(item.id)
					const FileIcon = getFileIcon(item.mimeType)
					const isImage = item.mimeType.startsWith('image/')

					return (
						<div
							key={item.id}
							className={cn(
								'flex items-center gap-4 p-3 border rounded-lg cursor-pointer transition-all',
								'hover:border-primary hover:bg-muted/50',
								isSelected && 'border-primary bg-primary/5',
							)}
							onClick={() => onView(item)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault()
									onView(item)
								}
							}}
						>
							{/* Selection checkbox */}
							<button
								type="button"
								className={cn(
									'flex-shrink-0 w-5 h-5 rounded border-2 transition-all',
									'flex items-center justify-center',
									isSelected
										? 'bg-primary border-primary text-primary-foreground'
										: 'bg-background border-muted-foreground/50',
								)}
								onClick={(e) => {
									e.stopPropagation()
									onSelect(item.id)
								}}
							>
								{isSelected && <Check className="w-3 h-3" />}
							</button>

							{/* Thumbnail */}
							{isImage ? (
								<img
									src={getThumbnailUrl(item.id)}
									alt={item.alt || item.originalFilename}
									className="w-12 h-12 object-cover rounded flex-shrink-0"
								/>
							) : (
								<div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
									<FileIcon className="w-6 h-6 text-muted-foreground" />
								</div>
							)}

							{/* Info */}
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium truncate">
									{item.originalFilename}
								</p>
								<p className="text-xs text-muted-foreground">
									{item.mimeType} • {formatFileSize(item.size)}
								</p>
							</div>

							{/* Folder */}
							{item.folder && (
								<span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
									{item.folder}
								</span>
							)}
						</div>
					)
				})}
			</div>
		)
	}

	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
			{items.map((item) => {
				const isSelected = selectedItems.includes(item.id)
				const FileIcon = getFileIcon(item.mimeType)
				const isImage = item.mimeType.startsWith('image/')

				return (
					<div
						key={item.id}
						className={cn(
							'group relative aspect-square border rounded-lg overflow-hidden cursor-pointer transition-all',
							'hover:border-primary hover:shadow-md',
							isSelected && 'border-primary ring-2 ring-primary/20',
						)}
						onClick={() => onView(item)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault()
								onView(item)
							}
						}}
					>
						{/* Selection checkbox */}
						<button
							type="button"
							className={cn(
								'absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 transition-all',
								'flex items-center justify-center',
								isSelected
									? 'bg-primary border-primary text-primary-foreground'
									: 'bg-background/80 border-muted-foreground/50 opacity-0 group-hover:opacity-100',
							)}
							onClick={(e) => {
								e.stopPropagation()
								onSelect(item.id)
							}}
						>
							{isSelected && <Check className="w-3 h-3" />}
						</button>

						{/* Preview */}
						{isImage ? (
							<img
								src={getThumbnailUrl(item.id)}
								alt={item.alt || item.originalFilename}
								className="w-full h-full object-cover"
							/>
						) : (
							<div className="w-full h-full flex flex-col items-center justify-center bg-muted">
								<FileIcon className="w-12 h-12 text-muted-foreground" />
								<span className="mt-2 text-xs text-muted-foreground uppercase">
									{item.mimeType.split('/')[1]?.slice(0, 4)}
								</span>
							</div>
						)}

						{/* Filename overlay */}
						<div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
							<p className="text-xs text-white truncate">
								{item.originalFilename}
							</p>
						</div>
					</div>
				)
			})}
		</div>
	)
}
