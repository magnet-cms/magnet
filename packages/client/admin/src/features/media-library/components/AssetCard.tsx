import { Button } from '@magnet-cms/ui'
import { cn } from '@magnet-cms/ui/lib/utils'
import {
	Download,
	Eye,
	File,
	FileArchive,
	FileCode,
	FileImage,
	FileSpreadsheet,
	FileText,
	FileType,
	MoreVertical,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useAppIntl } from '~/i18n'

interface Asset {
	id: string
	name: string
	type: 'image' | 'video' | 'document'
	url?: string
	size: string
	format: string
	duration?: string
}

interface AssetCardProps {
	asset: Asset
	isSelected?: boolean
	onSelect: (assetId: string) => void
	onView: (assetId: string) => void
	onDownload: (assetId: string) => void
}

interface DocumentIconInfo {
	icon: LucideIcon
	color: string
	bgColor: string
}

/**
 * Get the appropriate icon and color for a document type
 */
export function getDocumentIcon(format: string): DocumentIconInfo {
	const ext = format.toLowerCase()
	switch (ext) {
		case 'pdf':
			return { icon: FileText, color: 'text-red-500', bgColor: 'bg-red-50' }
		case 'doc':
		case 'docx':
		case 'odt':
		case 'rtf':
			return { icon: FileType, color: 'text-blue-500', bgColor: 'bg-blue-50' }
		case 'xls':
		case 'xlsx':
		case 'csv':
		case 'ods':
			return {
				icon: FileSpreadsheet,
				color: 'text-green-500',
				bgColor: 'bg-green-50',
			}
		case 'zip':
		case 'rar':
		case '7z':
		case 'tar':
		case 'gz':
			return {
				icon: FileArchive,
				color: 'text-yellow-600',
				bgColor: 'bg-yellow-50',
			}
		case 'svg':
			return {
				icon: FileImage,
				color: 'text-purple-500',
				bgColor: 'bg-purple-50',
			}
		case 'js':
		case 'ts':
		case 'jsx':
		case 'tsx':
		case 'json':
		case 'html':
		case 'css':
		case 'xml':
		case 'yaml':
		case 'yml':
			return {
				icon: FileCode,
				color: 'text-orange-500',
				bgColor: 'bg-orange-50',
			}
		default:
			return { icon: File, color: 'text-muted-foreground', bgColor: 'bg-muted' }
	}
}

export function AssetCard({
	asset,
	isSelected,
	onSelect,
	onView,
	onDownload,
}: AssetCardProps) {
	const intl = useAppIntl()
	const [isHovered, setIsHovered] = useState(false)

	const docIcon =
		asset.type === 'document' ? getDocumentIcon(asset.format) : null

	return (
		<div
			className="group relative bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<div className="aspect-square bg-muted relative overflow-hidden">
				{asset.type === 'image' && asset.url && (
					<img
						src={asset.url}
						alt={asset.name}
						className="w-full h-full object-cover"
					/>
				)}
				{asset.type === 'video' && (
					<div className="w-full h-full bg-black/70 flex items-center justify-center">
						<div className="text-white/70">
							{intl.formatMessage({
								id: 'media.video',
								defaultMessage: 'Video',
							})}
						</div>
						{asset.duration && (
							<div className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-medium text-white">
								{asset.duration}
							</div>
						)}
					</div>
				)}
				{asset.type === 'document' && docIcon && (
					<div
						className={cn(
							'w-full h-full flex flex-col items-center justify-center border-b border-border',
							docIcon.bgColor,
						)}
					>
						<docIcon.icon className={cn('w-12 h-12', docIcon.color)} />
						<span
							className={cn(
								'text-xs font-semibold mt-2 uppercase',
								docIcon.color,
							)}
						>
							{asset.format}
						</span>
					</div>
				)}

				{/* Selection Checkbox */}
				<div
					className={cn(
						'absolute top-2 left-2 transition-opacity',
						isHovered || isSelected ? 'opacity-100' : 'opacity-0',
					)}
				>
					<input
						type="checkbox"
						checked={isSelected}
						onChange={() => onSelect(asset.id)}
						className="w-4 h-4 rounded border-border text-foreground focus:ring-0 focus:ring-offset-0 cursor-pointer"
					/>
				</div>

				{/* Overlay Actions */}
				<div
					className={cn(
						'absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center gap-2 pointer-events-none',
						isHovered ? 'opacity-100' : 'opacity-0',
					)}
				>
					<Button
						size="sm"
						variant="secondary"
						onClick={(e) => {
							e.stopPropagation()
							onView(asset.id)
						}}
						className="p-1.5 bg-background/90 hover:bg-background pointer-events-auto"
					>
						<Eye className="w-4 h-4" />
					</Button>
					<Button
						size="sm"
						variant="secondary"
						onClick={(e) => {
							e.stopPropagation()
							onDownload(asset.id)
						}}
						className="p-1.5 bg-background/90 hover:bg-background pointer-events-auto"
					>
						<Download className="w-4 h-4" />
					</Button>
				</div>
			</div>
			<div className="p-2.5">
				<p className="text-sm font-medium text-foreground truncate">
					{asset.name}
				</p>
				<div className="flex items-center justify-between mt-1">
					<p className="text-xs text-muted-foreground">
						{asset.format.toUpperCase()} • {asset.size}
					</p>
					<button
						type="button"
						className={cn(
							'text-muted-foreground hover:text-foreground transition-opacity',
							isHovered ? 'opacity-100' : 'opacity-0',
						)}
					>
						<MoreVertical className="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	)
}
