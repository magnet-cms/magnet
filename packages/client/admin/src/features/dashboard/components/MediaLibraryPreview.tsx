import { Card } from '@magnet-cms/ui'
import { MoreVertical, Upload } from 'lucide-react'
import { useAppIntl } from '~/i18n'

interface MediaItem {
	id: string
	src: string
	alt: string
}

interface MediaLibraryPreviewProps {
	media: MediaItem[]
	onUpload?: () => void
	onViewImage?: (id: string) => void
}

export function MediaLibraryPreview({
	media,
	onUpload,
	onViewImage,
}: MediaLibraryPreviewProps) {
	const intl = useAppIntl()
	return (
		<div>
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-sm font-semibold text-foreground">
					{intl.formatMessage({
						id: 'dashboard.media.title',
						defaultMessage: 'Media Library',
					})}
				</h2>
				<button
					type="button"
					className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
				>
					<MoreVertical className="w-4 h-4" />
				</button>
			</div>
			<Card className="shadow-sm ring-1 ring-border p-1">
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
					{media.map((item) => (
						<button
							key={item.id}
							type="button"
							className="aspect-square relative group overflow-hidden rounded-lg bg-muted cursor-pointer"
							onClick={() => onViewImage?.(item.id)}
						>
							<img
								src={item.src}
								alt={item.alt}
								className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
							/>
							<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
								{intl.formatMessage({
									id: 'dashboard.media.view',
									defaultMessage: 'View',
								})}
							</div>
						</button>
					))}
					{onUpload && (
						<button
							type="button"
							onClick={onUpload}
							className="aspect-square bg-muted/80 rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted transition-colors"
						>
							<Upload className="w-6 h-6 text-muted-foreground mb-1" />
							<span className="text-xs text-muted-foreground">
								{intl.formatMessage({
									id: 'dashboard.media.upload',
									defaultMessage: 'Upload',
								})}
							</span>
						</button>
					)}
				</div>
			</Card>
		</div>
	)
}
