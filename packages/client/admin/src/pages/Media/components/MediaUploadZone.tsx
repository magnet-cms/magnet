import { Button } from '@magnet/ui/components'
import { cn } from '@magnet/ui/lib'
import { CloudUpload, File, X } from 'lucide-react'
import { useCallback, useState } from 'react'

interface MediaUploadZoneProps {
	onUpload: (files: File[]) => Promise<void>
	isUploading: boolean
	accept?: string
	maxFiles?: number
	maxSize?: number
}

const formatSize = (bytes: number): string => {
	if (bytes === 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

export const MediaUploadZone = ({
	onUpload,
	isUploading,
	accept = 'image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip',
	maxFiles = 10,
	maxSize = 50 * 1024 * 1024, // 50MB
}: MediaUploadZoneProps) => {
	const [isDragOver, setIsDragOver] = useState(false)
	const [files, setFiles] = useState<File[]>([])
	const [errors, setErrors] = useState<string[]>([])

	const validateFile = useCallback(
		(file: File): string | null => {
			if (maxSize && file.size > maxSize) {
				return `${file.name}: File too large (max ${formatSize(maxSize)})`
			}
			return null
		},
		[maxSize],
	)

	const addFiles = useCallback(
		(newFiles: FileList | File[]) => {
			const fileArray = Array.from(newFiles)
			const validFiles: File[] = []
			const newErrors: string[] = []

			for (const file of fileArray) {
				const error = validateFile(file)
				if (error) {
					newErrors.push(error)
				} else {
					validFiles.push(file)
				}
			}

			const remainingSlots = maxFiles - files.length
			if (validFiles.length > remainingSlots) {
				newErrors.push(`Only ${remainingSlots} more files allowed`)
				validFiles.splice(remainingSlots)
			}

			setFiles((prev) => [...prev, ...validFiles])
			setErrors(newErrors)
		},
		[files.length, maxFiles, validateFile],
	)

	const removeFile = useCallback((index: number) => {
		setFiles((prev) => prev.filter((_, i) => i !== index))
	}, [])

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			setIsDragOver(false)
			addFiles(e.dataTransfer.files)
		},
		[addFiles],
	)

	const handleUpload = useCallback(async () => {
		if (files.length === 0) return
		await onUpload(files)
		setFiles([])
		setErrors([])
	}, [files, onUpload])

	return (
		<div className="space-y-4">
			{/* Drop zone */}
			<div
				className={cn(
					'relative border-2 border-dashed rounded-lg p-8 transition-colors',
					'hover:border-primary/50',
					isDragOver && 'border-primary bg-primary/5',
				)}
				onDragOver={(e) => {
					e.preventDefault()
					setIsDragOver(true)
				}}
				onDragLeave={(e) => {
					e.preventDefault()
					setIsDragOver(false)
				}}
				onDrop={handleDrop}
			>
				<input
					type="file"
					accept={accept}
					multiple
					onChange={(e) => e.target.files && addFiles(e.target.files)}
					className="absolute inset-0 opacity-0 cursor-pointer"
				/>

				<div className="flex flex-col items-center justify-center gap-2 text-center">
					<CloudUpload className="w-12 h-12 text-muted-foreground" />
					<p className="text-sm font-medium">
						Drag & drop files here, or click to browse
					</p>
					<p className="text-xs text-muted-foreground">
						Max {maxFiles} files, up to {formatSize(maxSize)} each
					</p>
				</div>
			</div>

			{/* Errors */}
			{errors.length > 0 && (
				<div className="text-sm text-destructive">
					{errors.map((error) => (
						<p key={error}>{error}</p>
					))}
				</div>
			)}

			{/* File list */}
			{files.length > 0 && (
				<div className="space-y-2 max-h-60 overflow-y-auto">
					{files.map((file, index) => (
						<div
							key={`${file.name}-${index}`}
							className="flex items-center gap-3 p-3 border rounded-lg"
						>
							<File className="w-8 h-8 text-muted-foreground shrink-0" />
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium truncate">{file.name}</p>
								<p className="text-xs text-muted-foreground">
									{formatSize(file.size)}
								</p>
							</div>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => removeFile(index)}
								disabled={isUploading}
							>
								<X className="w-4 h-4" />
							</Button>
						</div>
					))}
				</div>
			)}

			{/* Upload button */}
			{files.length > 0 && (
				<Button
					className="w-full"
					onClick={handleUpload}
					disabled={isUploading}
				>
					{isUploading ? 'Uploading...' : `Upload ${files.length} file(s)`}
				</Button>
			)}
		</div>
	)
}
