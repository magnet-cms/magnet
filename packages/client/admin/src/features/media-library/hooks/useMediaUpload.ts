import { useState } from 'react'

interface UploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

export function useMediaUpload() {
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true)
    const newUploads: UploadProgress[] = files.map((file) => ({
      file,
      progress: 0,
      status: 'uploading',
    }))

    setUploads(newUploads)

    // Simulate upload progress
    for (let i = 0; i < newUploads.length; i++) {
      const upload = newUploads[i]!
      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        setUploads((prev) => {
          const updated = [...prev]
          updated[i] = { file: upload.file, progress, status: 'uploading' }
          return updated
        })
      }

      // Mark as success
      setUploads((prev) => {
        const updated = [...prev]
        updated[i] = { file: upload.file, progress: 100, status: 'success' }
        return updated
      })
    }

    setIsUploading(false)

    // Clear uploads after a delay
    setTimeout(() => {
      setUploads([])
    }, 3000)
  }

  return {
    uploads,
    isUploading,
    uploadFiles,
  }
}
