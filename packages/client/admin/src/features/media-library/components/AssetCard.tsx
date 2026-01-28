import { Button } from '@magnet-cms/ui'
import { cn } from '@magnet-cms/ui/lib/utils'
import { Download, Eye, MoreVertical } from 'lucide-react'
import { useState } from 'react'

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

export function AssetCard({ asset, isSelected, onSelect, onView, onDownload }: AssetCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {asset.type === 'image' && asset.url && (
          <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
        )}
        {asset.type === 'video' && (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <div className="text-white opacity-50">Video</div>
            {asset.duration && (
              <div className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-medium text-white">
                {asset.duration}
              </div>
            )}
          </div>
        )}
        {asset.type === 'document' && (
          <div className="w-full h-full bg-gray-50 flex items-center justify-center border-b border-gray-100">
            <div className="text-gray-300">Document</div>
          </div>
        )}

        {/* Selection Checkbox */}
        <div
          className={cn(
            'absolute top-2 left-2 transition-opacity',
            isHovered || isSelected ? 'opacity-100' : 'opacity-0'
          )}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(asset.id)}
            className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
        </div>

        {/* Overlay Actions */}
        <div
          className={cn(
            'absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center gap-2',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation()
              onView(asset.id)
            }}
            className="p-1.5 bg-white/90 hover:bg-white"
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
            className="p-1.5 bg-white/90 hover:bg-white"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-sm font-medium text-gray-900 truncate">{asset.name}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-500">
            {asset.format.toUpperCase()} • {asset.size}
          </p>
          <button
            className={cn(
              'text-gray-400 hover:text-gray-600 transition-opacity',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
