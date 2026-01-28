import { Button } from '@magnet-cms/ui'
import { Upload } from 'lucide-react'
import { useRef, useState } from 'react'

interface UploadButtonProps {
  onUpload: (files: File[]) => void
  multiple?: boolean
  accept?: string
}

export function UploadButton({ onUpload, multiple = true, accept }: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      onUpload(Array.from(files))
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

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

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />
      <Button
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={isDragging ? 'bg-gray-800' : ''}
      >
        <Upload className="w-3.5 h-3.5" />
        Upload Assets
      </Button>
    </>
  )
}
