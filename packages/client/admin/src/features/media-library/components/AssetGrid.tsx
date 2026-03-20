import { cn } from '@magnet-cms/ui/lib/utils'
import { AssetCard, getDocumentIcon } from './AssetCard'

interface Asset {
	id: string
	name: string
	type: 'image' | 'video' | 'document'
	url?: string
	size: string
	format: string
	duration?: string
}

interface AssetGridProps {
	assets: Asset[]
	selectedIds: string[]
	onAssetSelect: (assetId: string) => void
	onAssetView: (assetId: string) => void
	onAssetDownload: (assetId: string) => void
	viewMode: 'grid' | 'list'
}

export function AssetGrid({
	assets,
	selectedIds,
	onAssetSelect,
	onAssetView,
	onAssetDownload,
	viewMode,
}: AssetGridProps) {
	if (viewMode === 'list') {
		return (
			<div className="space-y-2">
				{assets.map((asset) => {
					const docIcon =
						asset.type === 'document' ? getDocumentIcon(asset.format) : null
					return (
						<button
							type="button"
							key={asset.id}
							className="flex w-full cursor-pointer items-center gap-4 rounded-lg border border-border bg-card p-3 text-left transition-all hover:shadow-sm"
							onClick={() => onAssetView(asset.id)}
						>
							<input
								type="checkbox"
								checked={selectedIds.includes(asset.id)}
								onChange={(e) => {
									e.stopPropagation()
									onAssetSelect(asset.id)
								}}
								onClick={(e) => e.stopPropagation()}
								className="size-4 rounded border-border"
							/>
							<div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
								{asset.type === 'image' && asset.url ? (
									<img
										src={asset.url}
										alt={asset.name}
										className="w-full h-full object-cover"
									/>
								) : asset.type === 'document' && docIcon ? (
									<div
										className={cn(
											'w-full h-full flex items-center justify-center',
											docIcon.bgColor,
										)}
									>
										<docIcon.icon className={cn('w-5 h-5', docIcon.color)} />
									</div>
								) : (
									<div className="flex size-full items-center justify-center bg-foreground/90">
										<span className="text-[8px] text-primary-foreground">
											VID
										</span>
									</div>
								)}
							</div>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-foreground">
									{asset.name}
								</p>
								<p className="text-xs text-muted-foreground">
									{asset.format.toUpperCase()} • {asset.size}
								</p>
							</div>
						</button>
					)
				})}
			</div>
		)
	}

	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
			{assets.map((asset) => (
				<AssetCard
					key={asset.id}
					asset={asset}
					isSelected={selectedIds.includes(asset.id)}
					onSelect={onAssetSelect}
					onView={onAssetView}
					onDownload={onAssetDownload}
				/>
			))}
		</div>
	)
}
