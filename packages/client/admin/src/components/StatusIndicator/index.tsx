import { Badge, Button } from '@magnet-cms/ui/components'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

interface StatusIndicatorProps {
	status: 'draft' | 'published'
	hasPublished?: boolean
	onPublish?: () => void
	onUnpublish?: () => void
	isPublishing?: boolean
	isUnpublishing?: boolean
	disabled?: boolean
}

export const StatusIndicator = ({
	status,
	hasPublished,
	onPublish,
	onUnpublish,
	isPublishing,
	isUnpublishing,
	disabled,
}: StatusIndicatorProps) => {
	const isLoading = isPublishing || isUnpublishing

	return (
		<div className="flex items-center gap-2">
			{/* Status badge */}
			<Badge
				variant={status === 'published' ? 'default' : 'secondary'}
				className="capitalize"
			>
				{status}
			</Badge>

			{/* Publish/Unpublish buttons */}
			{onPublish && status === 'draft' && (
				<Button
					variant="outline"
					size="sm"
					onClick={onPublish}
					disabled={disabled || isLoading}
					className="gap-1"
				>
					{isPublishing ? (
						<Loader2 className="h-3 w-3 animate-spin" />
					) : (
						<Eye className="h-3 w-3" />
					)}
					Publish
				</Button>
			)}

			{onUnpublish && hasPublished && (
				<Button
					variant="outline"
					size="sm"
					onClick={onUnpublish}
					disabled={disabled || isLoading}
					className="gap-1"
				>
					{isUnpublishing ? (
						<Loader2 className="h-3 w-3 animate-spin" />
					) : (
						<EyeOff className="h-3 w-3" />
					)}
					Unpublish
				</Button>
			)}
		</div>
	)
}
