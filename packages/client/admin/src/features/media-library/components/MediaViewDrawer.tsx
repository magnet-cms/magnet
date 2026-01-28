import {
  Button,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@magnet-cms/ui'
import { Crop, Download, Link2, Maximize2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Asset {
  id: string
  name: string
  type: 'image' | 'video' | 'document'
  url?: string
  size: string
  format: string
  duration?: string
  createdAt?: string
  uploadedBy?: string
  altText?: string
  location?: string
  dimensions?: string
}

interface AssetUpdate {
  id: string
  name?: string
  altText?: string
}

interface MediaViewDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset: Asset | null
  onReplace?: (file: File) => void
  onDownload?: (assetId: string) => void
  onDelete?: (assetId: string) => void
  onSave?: (updates: AssetUpdate) => void
}

export function MediaViewDrawer({
  open,
  onOpenChange,
  asset,
  onReplace,
  onDownload,
  onDelete,
  onSave,
}: MediaViewDrawerProps) {
  const [filename, setFilename] = useState('')
  const [altText, setAltText] = useState('')

  // Update local state when asset changes
  useEffect(() => {
    if (asset) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilename(asset.name)

      setAltText(asset.altText || '')
    }
  }, [asset])

  if (!asset) return null

  const handleSave = () => {
    if (onSave) {
      onSave({
        id: asset.id,
        name: filename,
        altText: altText,
      })
    }
    onOpenChange(false)
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload(asset.id)
    }
  }

  const handleDelete = () => {
    if (onDelete && confirm('Are you sure you want to delete this asset?')) {
      onDelete(asset.id)
      onOpenChange(false)
    }
  }

  const handleReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onReplace) {
      onReplace(file)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-base">File Details</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                View and edit asset properties.
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2">
                <Maximize2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-8">
          {/* Preview */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
            <div className="aspect-video w-full relative flex items-center justify-center bg-gray-100">
              {asset.type === 'image' && asset.url ? (
                <img src={asset.url} alt={asset.name} className="h-full w-full object-contain" />
              ) : asset.type === 'video' ? (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <div className="text-white opacity-50">Video Preview</div>
                  {asset.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-medium text-white">
                      {asset.duration}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-300 text-4xl">Document</div>
              )}
            </div>
            <div className="bg-white px-3 py-2 border-t border-gray-200 flex justify-between items-center">
              <span className="text-xs font-mono text-gray-500">
                {asset.dimensions || `${asset.format.toUpperCase()} • ${asset.size}`}
              </span>
              <div className="flex gap-2">
                <button
                  className="p-1 text-gray-400 hover:text-gray-900 transition-colors"
                  title="Crop"
                >
                  <Crop className="w-4 h-4" />
                </button>
                <button
                  className="p-1 text-gray-400 hover:text-gray-900 transition-colors"
                  title="Open Original"
                >
                  <Link2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleReplace}
                  accept="image/*,video/*,.pdf,.doc,.docx"
                />
                <Download className="w-3.5 h-3.5" />
                Replace File
              </label>
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 px-1">
              Tip: Drag and drop a new file here to replace current version.
            </p>
          </div>

          {/* Metadata Form */}
          <div className="space-y-5">
            <div>
              <Label htmlFor="filename" className="text-xs font-medium text-gray-700 mb-1.5">
                File Name
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  id="filename"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6 pl-3 pr-12"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-400 text-xs">.{asset.format}</span>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="alt-text" className="text-xs font-medium text-gray-700 mb-1.5">
                Alt Text
              </Label>
              <Textarea
                id="alt-text"
                rows={2}
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6 pl-3 resize-none"
                placeholder="Describe this image for accessibility"
              />
            </div>

            {/* Folder Context */}
            <div>
              <Label className="block text-xs font-medium text-gray-700 mb-1.5">Location</Label>
              <div className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-md">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-4 h-4 text-gray-400 shrink-0">📁</div>
                  <span className="text-xs text-gray-600 truncate">{asset.location || 'Root'}</span>
                </div>
                <button className="text-xs text-blue-600 font-medium hover:text-blue-700 whitespace-nowrap ml-2">
                  Move
                </button>
              </div>
              <button className="flex items-center gap-1.5 mt-2 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                <span className="text-xs">+</span>
                Create new subfolder
              </button>
            </div>

            {/* Info Grid */}
            <div>
              <h4 className="text-xs font-medium text-gray-900 mb-3 border-t border-gray-100 pt-4">
                Information
              </h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <dt className="text-[10px] text-gray-400 uppercase tracking-wide">File Size</dt>
                  <dd className="text-xs font-medium text-gray-700 mt-0.5">{asset.size}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-gray-400 uppercase tracking-wide">Created</dt>
                  <dd className="text-xs font-medium text-gray-700 mt-0.5">
                    {asset.createdAt || 'Unknown'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] text-gray-400 uppercase tracking-wide">Uploaded By</dt>
                  <dd className="text-xs font-medium text-gray-700 mt-0.5 flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px]">
                      {asset.uploadedBy?.[0]?.toUpperCase() || 'U'}
                    </div>
                    {asset.uploadedBy || 'Unknown'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] text-gray-400 uppercase tracking-wide">Extension</dt>
                  <dd className="text-xs font-medium text-gray-700 mt-0.5 uppercase">
                    {asset.format}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-200 p-4 bg-gray-50 flex justify-between items-center z-10">
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            className="text-xs font-medium text-red-600 hover:text-red-700 bg-white border border-red-200 hover:bg-red-50 px-3 py-2"
          >
            Delete Asset
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 px-4 py-2"
          >
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
