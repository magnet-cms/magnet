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
							className="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-all cursor-pointer w-full text-left"
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
								className="w-4 h-4 rounded border-gray-300"
							/>
							<div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
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
									<div className="w-full h-full bg-gray-800 flex items-center justify-center">
										<span className="text-white text-[8px]">VID</span>
									</div>
								)}
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-gray-900 truncate">
									{asset.name}
								</p>
								<p className="text-xs text-gray-500">
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
