'use client'

import { CloudUpload, File, FileText, Image, Video, X } from 'lucide-react'
import { type ReactElement, useCallback, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'

import { Button } from '../../atoms/button'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../atoms/form'
import { Progress } from '../../atoms/progress'
import { cn } from '../../../lib/utils'

type FileWithPreview = File & {
  preview?: string
  progress?: number
  id: string
}

type Props = {
  name: string
  label: string
  description?: ReactElement | string
  accept?: string
  multiple?: boolean
  maxFiles?: number
  maxSize?: number // in bytes
  disabled?: boolean
  required?: boolean
  onUpload?: (files: File[]) => Promise<void>
  className?: string
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileIcon = (file: File) => {
  if (file.type.startsWith('image/')) return Image
  if (file.type.startsWith('video/')) return Video
  if (file.type.includes('pdf') || file.type.includes('document')) return FileText
  return File
}

const createFilePreview = (file: File): Promise<string | undefined> => {
  return new Promise((resolve) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(undefined)
      reader.readAsDataURL(file)
    } else {
      resolve(undefined)
    }
  })
}

export const RHFFileUpload = ({
  name,
  label,
  description,
  accept,
  multiple = false,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB default
  disabled,
  required,
  onUpload,
  className,
}: Props) => {
  const { control, setValue, watch } = useFormContext()
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number
  }>({})

  const files: FileWithPreview[] = useMemo(() => watch(name) || [], [watch, name])

  const validateFile = useCallback(
    (file: File): string | null => {
      if (maxSize && file.size > maxSize) {
        return `File size must be less than ${formatFileSize(maxSize)}`
      }
      return null
    },
    [maxSize]
  )

  const addFiles = useCallback(
    async (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles)
      const validFiles: FileWithPreview[] = []
      const errors: string[] = []

      for (const file of fileArray) {
        const error = validateFile(file)
        if (error) {
          errors.push(`${file.name}: ${error}`)
          continue
        }

        const preview = await createFilePreview(file)
        const fileWithPreview: FileWithPreview = Object.assign(file, {
          preview,
          progress: 0,
          id: `${file.name}-${file.size}-${Date.now()}`,
        })

        validFiles.push(fileWithPreview)
      }

      if (errors.length > 0) {
        // In a real app, you'd want to show these errors to the user
        console.warn('File validation errors:', errors)
      }

      const currentFiles = files || []
      const totalFiles = currentFiles.length + validFiles.length

      if (maxFiles && totalFiles > maxFiles) {
        const allowedCount = Math.max(0, maxFiles - currentFiles.length)
        validFiles.splice(allowedCount)
      }

      const updatedFiles = [...currentFiles, ...validFiles]
      setValue(name, updatedFiles, { shouldValidate: true })

      // Handle upload if onUpload is provided
      if (onUpload && validFiles.length > 0) {
        setUploading(true)
        try {
          await onUpload(validFiles)
          // Update progress to 100% for all uploaded files
          const progressUpdate = { ...uploadProgress }
          validFiles.forEach((file) => {
            progressUpdate[file.id] = 100
          })
          setUploadProgress(progressUpdate)
        } catch (error) {
          console.error('Upload failed:', error)
        } finally {
          setUploading(false)
        }
      }
    },
    [files, setValue, name, maxFiles, onUpload, uploadProgress, validateFile]
  )

  const removeFile = useCallback(
    (fileId: string) => {
      const updatedFiles = files.filter((file) => file.id !== fileId)
      setValue(name, updatedFiles, { shouldValidate: true })

      // Clean up progress tracking
      const updatedProgress = { ...uploadProgress }
      delete updatedProgress[fileId]
      setUploadProgress(updatedProgress)
    },
    [files, setValue, name, uploadProgress]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      if (disabled) return

      const droppedFiles = e.dataTransfer.files
      if (droppedFiles.length > 0) {
        addFiles(droppedFiles)
      }
    },
    [disabled, addFiles]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files
      if (selectedFiles && selectedFiles.length > 0) {
        addFiles(selectedFiles)
      }
      // Reset input value to allow selecting the same file again
      e.target.value = ''
    },
    [addFiles]
  )

  return (
    <FormField
      name={name}
      control={control}
      render={({ fieldState }) => (
        <FormItem className={cn('gap-1', className)}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <div className="space-y-4">
              {/* Drop Zone */}
              <div
                className={cn(
                  'relative border-2 border-dashed rounded-lg p-6 transition-colors',
                  'hover:border-primary/50 focus-within:border-primary',
                  isDragOver && 'border-primary bg-primary/5',
                  disabled && 'opacity-50 cursor-not-allowed',
                  fieldState.error && 'border-destructive'
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept={accept}
                  multiple={multiple}
                  disabled={disabled}
                  required={required}
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  aria-describedby={description ? `${name}-description` : undefined}
                />

                <div className="flex flex-col items-center justify-center gap-2 text-center">
                  <CloudUpload
                    className={cn('size-8 text-muted-foreground', isDragOver && 'text-primary')}
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {isDragOver
                        ? 'Drop files here'
                        : 'Drag & drop files here, or click to select'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {accept && `Accepted: ${accept}`}
                      {maxSize && ` • Max size: ${formatFileSize(maxSize)}`}
                      {multiple && maxFiles && ` • Max files: ${maxFiles}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    Selected Files ({files.length}
                    {maxFiles ? `/${maxFiles}` : ''})
                  </div>
                  <div className="space-y-2">
                    {files.map((file) => {
                      const FileIcon = getFileIcon(file)
                      const progress = uploadProgress[file.id] || 0
                      const isUploading = uploading && progress < 100

                      return (
                        <div
                          key={file.id}
                          className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                        >
                          {/* File Preview/Icon */}
                          <div className="size-10 shrink-0 rounded overflow-hidden bg-muted">
                            {file.preview ? (
                              <img
                                src={file.preview}
                                alt={file.name}
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="size-full flex items-center justify-center">
                                <FileIcon className="size-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{file.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </div>
                            {isUploading && <Progress value={progress} className="mt-1 h-1" />}
                          </div>

                          {/* Remove Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(file.id)}
                            disabled={disabled || isUploading}
                            className="size-8 text-muted-foreground hover:text-destructive"
                            aria-label={`Remove ${file.name}`}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </FormControl>
          {description && (
            <FormDescription id={`${name}-description`}>{description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
