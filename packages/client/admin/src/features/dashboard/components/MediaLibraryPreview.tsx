import { Card } from '@magnet-cms/ui'
import { MoreVertical, Upload } from 'lucide-react'

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

export function MediaLibraryPreview({ media, onUpload, onViewImage }: MediaLibraryPreviewProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Media Library</h2>
        <button className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-900 transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
      <Card className="shadow-sm ring-1 ring-gray-200 p-1">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
          {media.map((item) => (
            <div
              key={item.id}
              className="aspect-square relative group overflow-hidden rounded-lg bg-gray-100 cursor-pointer"
              onClick={() => onViewImage?.(item.id)}
            >
              <img
                src={item.src}
                alt={item.alt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                View
              </div>
            </div>
          ))}
          {onUpload && (
            <div
              onClick={onUpload}
              className="aspect-square bg-gray-50 rounded-lg border border-dashed border-gray-200 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <Upload className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-xs text-gray-500">Upload</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
