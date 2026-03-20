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
import { useAppIntl } from '~/i18n'

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

export function UploadAssetsDrawer({
	open,
	onOpenChange,
	onUpload,
}: UploadAssetsDrawerProps) {
	const intl = useAppIntl()
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
					prev.map((f) =>
						f.id === uploadFile.id ? { ...f, status: 'uploading' } : f,
					),
				)

				// Simulate progress
				let progress = 0
				const interval = setInterval(() => {
					progress += 10
					setUploadFiles((prev) =>
						prev.map((f) =>
							f.id === uploadFile.id
								? { ...f, progress: Math.min(progress, 100) }
								: f,
						),
					)

					if (progress >= 100) {
						clearInterval(interval)
						setUploadFiles((prev) =>
							prev.map((f) =>
								f.id === uploadFile.id ? { ...f, status: 'completed' } : f,
							),
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

	const completedCount = uploadFiles.filter(
		(f) => f.status === 'completed',
	).length
	const totalCount = uploadFiles.length

	return (
		<Sheet open={open} onOpenChange={handleClose}>
			<SheetContent side="right" className="w-full sm:max-w-sm flex flex-col">
				<SheetHeader>
					<SheetTitle>
						{intl.formatMessage({
							id: 'media.uploadDrawer.title',
							defaultMessage: 'Upload Assets',
						})}
					</SheetTitle>
					<SheetDescription>
						{intl.formatMessage({
							id: 'media.uploadDrawer.description',
							defaultMessage: 'Select files to upload to your media library.',
						})}
					</SheetDescription>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto py-6 px-5 space-y-4">
					{/* Drop Zone */}
					<div
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						className={cn(
							'rounded-lg border-2 border-dashed p-8 text-center transition-colors',
							isDragging
								? 'border-primary bg-primary/5'
								: 'border-border bg-muted/40 hover:border-muted-foreground/40 hover:bg-muted/60',
						)}
					>
						<div className="flex flex-col items-center gap-3">
							<div
								className={cn(
									'flex size-12 items-center justify-center rounded-full transition-colors',
									isDragging ? 'bg-primary' : 'bg-muted',
								)}
							>
								<Upload
									className={cn(
										'size-6',
										isDragging
											? 'text-primary-foreground'
											: 'text-muted-foreground',
									)}
								/>
							</div>
							<div>
								<p className="text-sm font-medium text-foreground">
									{isDragging
										? intl.formatMessage({
												id: 'media.uploadDrawer.dropHere',
												defaultMessage: 'Drop files here',
											})
										: intl.formatMessage({
												id: 'media.uploadDrawer.dragAndDrop',
												defaultMessage: 'Drag and drop files',
											})}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{intl.formatMessage({
										id: 'media.uploadDrawer.orBrowse',
										defaultMessage: 'or click to browse',
									})}
								</p>
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
								{intl.formatMessage({
									id: 'media.uploadDrawer.selectFiles',
									defaultMessage: 'Select Files',
								})}
							</Button>
						</div>
					</div>

					{/* Upload Queue */}
					{uploadFiles.length > 0 && (
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-xs font-medium text-foreground">
									{intl.formatMessage({
										id: 'media.uploadDrawer.uploadQueue',
										defaultMessage: 'Upload Queue',
									})}
								</span>
								<span className="text-[10px] text-muted-foreground">
									{intl.formatMessage(
										{
											id: 'media.uploadDrawer.completed',
											defaultMessage: '{completed} of {total} completed',
										},
										{ completed: completedCount, total: totalCount },
									)}
								</span>
							</div>

							<div className="space-y-2">
								{uploadFiles.map((uploadFile) => (
									<div
										key={uploadFile.id}
										className="rounded-lg border border-border bg-muted p-3 text-foreground shadow-sm"
									>
										<div className="flex items-center gap-2 mb-2">
											{uploadFile.status === 'completed' ? (
												<CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
											) : uploadFile.status === 'uploading' ? (
												<div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
											) : (
												<div className="size-3.5 shrink-0 rounded-full border-2 border-muted-foreground/40 border-t-transparent" />
											)}
											<span className="flex-1 truncate text-xs text-muted-foreground">
												{uploadFile.file.name}
											</span>
											{uploadFile.status !== 'uploading' && (
												<button
													type="button"
													onClick={() => handleRemoveFile(uploadFile.id)}
													className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
												>
													<X className="w-3.5 h-3.5" />
												</button>
											)}
											{uploadFile.status === 'uploading' && (
												<span className="shrink-0 text-[10px] text-muted-foreground">
													{uploadFile.progress}%
												</span>
											)}
										</div>
										{uploadFile.status === 'uploading' && (
											<div className="h-1 overflow-hidden rounded-full bg-muted-foreground/20">
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
						<p className="mt-4 text-center text-[10px] text-muted-foreground/80">
							{intl.formatMessage({
								id: 'media.uploadDrawer.tip',
								defaultMessage:
									'Tip: Drag and drop files here or click to browse.',
							})}
						</p>
					)}
				</div>

				<SheetFooter>
					<Button variant="outline" onClick={handleClose}>
						{intl.formatMessage({
							id: 'common.actions.cancel',
							defaultMessage: 'Cancel',
						})}
					</Button>
					<Button
						onClick={handleStartUpload}
						disabled={
							uploadFiles.length === 0 ||
							uploadFiles.every((f) => f.status === 'completed')
						}
					>
						<Upload className="w-4 h-4 mr-2" />
						{uploadFiles.some((f) => f.status === 'uploading')
							? intl.formatMessage({
									id: 'media.uploading',
									defaultMessage: 'Uploading...',
								})
							: intl.formatMessage({
									id: 'media.uploadDrawer.startUpload',
									defaultMessage: 'Start Upload',
								})}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	)
}
