import { AssetCard } from './AssetCard'

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
    // List view implementation (simplified for now)
    return (
      <div className="space-y-2">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-all"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(asset.id)}
              onChange={() => onAssetSelect(asset.id)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{asset.name}</p>
              <p className="text-xs text-gray-500">
                {asset.format.toUpperCase()} • {asset.size}
              </p>
            </div>
          </div>
        ))}
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
