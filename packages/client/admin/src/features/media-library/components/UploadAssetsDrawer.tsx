import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@magnet-cms/ui'
import { cn } from '@magnet-cms/ui/lib/utils'
import { CheckCircle2, Upload, X } from 'lucide-react'
import { useCallback, useState } from 'react'

interface UploadFile {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
}

interface UploadAssetsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload: (files: File[]) => void
}

export function UploadAssetsDrawer({ open, onOpenChange, onUpload }: UploadAssetsDrawerProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      const newFiles: UploadFile[] = Array.from(files).map((file, index) => ({
        file,
        id: `${Date.now()}-${index}`,
        progress: 0,
        status: 'pending' as const,
      }))
      setUploadFiles((prev) => [...prev, ...newFiles])
    }
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleRemoveFile = (id: string) => {
    setUploadFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const handleStartUpload = () => {
    if (uploadFiles.length === 0) return

    // Simulate upload progress
    uploadFiles.forEach((uploadFile) => {
      if (uploadFile.status === 'pending') {
        setUploadFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'uploading' } : f))
        )

        // Simulate progress
        let progress = 0
        const interval = setInterval(() => {
          progress += 10
          setUploadFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, progress: Math.min(progress, 100) } : f
            )
          )

          if (progress >= 100) {
            clearInterval(interval)
            setUploadFiles((prev) =>
              prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'completed' } : f))
            )
          }
        }, 200)
      }
    })

    // Call the actual upload handler
    const filesToUpload = uploadFiles.map((uf) => uf.file)
    onUpload(filesToUpload)
  }

  const handleClose = () => {
    setUploadFiles([])
    setIsDragging(false)
    onOpenChange(false)
  }

  const completedCount = uploadFiles.filter((f) => f.status === 'completed').length
  const totalCount = uploadFiles.length

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-sm flex flex-col">
        <SheetHeader>
          <SheetTitle>Upload Assets</SheetTitle>
          <SheetDescription>Select files to upload to your media library.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 px-5 space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isDragging
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-300 bg-gray-50/50 hover:border-gray-400 hover:bg-gray-50'
            )}
          >
            <div className="flex flex-col items-center gap-3">
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                  isDragging ? 'bg-gray-900' : 'bg-gray-100'
                )}
              >
                <Upload className={cn('w-6 h-6', isDragging ? 'text-white' : 'text-gray-600')} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {isDragging ? 'Drop files here' : 'Drag and drop files'}
                </p>
                <p className="text-xs text-gray-500 mt-1">or click to browse</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.multiple = true
                  input.accept = 'image/*,video/*,.pdf,.doc,.docx'
                  input.onchange = (e) => {
                    const target = e.target as HTMLInputElement
                    handleFileSelect(target.files)
                  }
                  input.click()
                }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Select Files
              </Button>
            </div>
          </div>

          {/* Upload Queue */}
          {uploadFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-900">Upload Queue</span>
                <span className="text-[10px] text-gray-500">
                  {completedCount} of {totalCount} completed
                </span>
              </div>

              <div className="space-y-2">
                {uploadFiles.map((uploadFile) => (
                  <div
                    key={uploadFile.id}
                    className="bg-gray-900 rounded-lg p-3 text-white shadow-lg"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {uploadFile.status === 'completed' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                      ) : uploadFile.status === 'uploading' ? (
                        <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full shrink-0" />
                      )}
                      <span className="text-xs text-gray-300 truncate flex-1">
                        {uploadFile.file.name}
                      </span>
                      {uploadFile.status !== 'uploading' && (
                        <button
                          onClick={() => handleRemoveFile(uploadFile.id)}
                          className="text-gray-400 hover:text-white transition-colors shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {uploadFile.status === 'uploading' && (
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {uploadFile.progress}%
                        </span>
                      )}
                    </div>
                    {uploadFile.status === 'uploading' && (
                      <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${uploadFile.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadFiles.length === 0 && (
            <p className="text-[10px] text-gray-400 text-center mt-4">
              Tip: Drag and drop files here or click to browse.
            </p>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleStartUpload}
            disabled={
              uploadFiles.length === 0 || uploadFiles.every((f) => f.status === 'completed')
            }
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploadFiles.some((f) => f.status === 'uploading') ? 'Uploading...' : 'Start Upload'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
