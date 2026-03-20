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
import { cn } from '@magnet-cms/ui/lib/utils'
import { Crop, Download, Link2, Maximize2, Minimize2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppIntl } from '~/i18n'
import { getDocumentIcon } from './AssetCard'

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

interface MediaFolder {
	id: string
	name: string
	path: string
	itemCount: number
}

interface MediaViewDrawerProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	asset: Asset | null
	folders?: MediaFolder[]
	onReplace?: (file: File) => void
	onDownload?: (assetId: string) => void
	onDelete?: (assetId: string) => void
	onSave?: (updates: AssetUpdate) => void
	onMove?: (assetId: string, folder: string) => void
	onCreateSubfolder?: (name: string, parentPath?: string) => void
}

export function MediaViewDrawer({
	open,
	onOpenChange,
	asset,
	folders,
	onReplace,
	onDownload,
	onDelete,
	onSave,
	onMove,
	onCreateSubfolder,
}: MediaViewDrawerProps) {
	const intl = useAppIntl()
	const [filename, setFilename] = useState('')
	const [altText, setAltText] = useState('')
	const [isExpanded, setIsExpanded] = useState(false)
	const [showMoveSelect, setShowMoveSelect] = useState(false)
	const [showSubfolderInput, setShowSubfolderInput] = useState(false)
	const [subfolderName, setSubfolderName] = useState('')

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
		if (
			onDelete &&
			confirm(
				intl.formatMessage({
					id: 'media.viewDrawer.deleteConfirm',
					defaultMessage: 'Are you sure you want to delete this asset?',
				}),
			)
		) {
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
			<SheetContent
				side="right"
				className={cn(
					'w-full flex flex-col p-0 transition-all',
					isExpanded ? 'sm:max-w-3xl' : 'sm:max-w-sm',
				)}
			>
				<SheetHeader className="px-5 py-4 border-b border-border bg-background sticky top-0 z-10">
					<div className="flex items-start justify-between">
						<div>
							<SheetTitle className="text-base">
								{intl.formatMessage({
									id: 'media.viewDrawer.fileDetails',
									defaultMessage: 'File Details',
								})}
							</SheetTitle>
							<SheetDescription className="text-xs mt-0.5">
								View and edit asset properties.
							</SheetDescription>
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								className="rounded-md bg-background text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
								onClick={() => setIsExpanded(!isExpanded)}
								title={
									isExpanded
										? intl.formatMessage({
												id: 'media.viewDrawer.collapse',
												defaultMessage: 'Collapse',
											})
										: intl.formatMessage({
												id: 'media.viewDrawer.expand',
												defaultMessage: 'Expand',
											})
								}
							>
								{isExpanded ? (
									<Minimize2 className="w-5 h-5" />
								) : (
									<Maximize2 className="w-5 h-5" />
								)}
							</button>
							<button
								type="button"
								onClick={() => onOpenChange(false)}
								className="rounded-md bg-background text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
					</div>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto px-5 py-6 space-y-8">
					{/* Preview */}
					<div className="rounded-lg border border-border bg-muted/50 overflow-hidden">
						<div
							className={cn(
								'w-full relative flex items-center justify-center bg-muted',
								isExpanded ? 'min-h-[60vh]' : 'aspect-video',
							)}
						>
							{asset.type === 'image' && asset.url ? (
								<img
									src={asset.url}
									alt={asset.name}
									className={cn(
										'object-contain',
										isExpanded ? 'max-h-[60vh] w-auto' : 'h-full w-full',
									)}
								/>
							) : asset.type === 'video' ? (
								<div className="w-full h-full bg-foreground/90 flex items-center justify-center">
									<div className="text-white opacity-50">
										{intl.formatMessage({
											id: 'media.viewDrawer.videoPreview',
											defaultMessage: 'Video Preview',
										})}
									</div>
									{asset.duration && (
										<div className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-medium text-white">
											{asset.duration}
										</div>
									)}
								</div>
							) : isExpanded && asset.format === 'pdf' && asset.url ? (
								<iframe
									src={asset.url}
									title={`PDF: ${asset.name}`}
									className="w-full h-full min-h-[60vh] border-0"
								/>
							) : (
								(() => {
									const docIcon = getDocumentIcon(asset.format)
									return (
										<div
											className={cn(
												'w-full h-full flex flex-col items-center justify-center',
												docIcon.bgColor,
											)}
										>
											<docIcon.icon
												className={cn(
													isExpanded ? 'w-24 h-24' : 'w-16 h-16',
													docIcon.color,
												)}
											/>
											<span
												className={cn(
													'font-semibold mt-2 uppercase',
													isExpanded ? 'text-lg' : 'text-sm',
													docIcon.color,
												)}
											>
												{asset.format}
											</span>
											{isExpanded && (
												<Button
													size="sm"
													variant="outline"
													className="mt-4"
													onClick={handleDownload}
												>
													<Download className="w-4 h-4 mr-2" />
													Download File
												</Button>
											)}
										</div>
									)
								})()
							)}
						</div>
						<div className="bg-background px-3 py-2 border-t border-border flex justify-between items-center">
							<span className="text-xs font-mono text-muted-foreground">
								{asset.dimensions ||
									`${asset.format.toUpperCase()} • ${asset.size}`}
							</span>
							<div className="flex gap-2">
								<button
									type="button"
									className="p-1 text-muted-foreground hover:text-foreground transition-colors"
									title={intl.formatMessage({
										id: 'media.viewDrawer.crop',
										defaultMessage: 'Crop',
									})}
								>
									<Crop className="w-4 h-4" />
								</button>
								<button
									type="button"
									className="p-1 text-muted-foreground hover:text-foreground transition-colors"
									title={intl.formatMessage({
										id: 'media.viewDrawer.openOriginal',
										defaultMessage: 'Open Original',
									})}
									onClick={() => {
										if (asset.url) window.open(asset.url, '_blank')
									}}
								>
									<Link2 className="w-4 h-4" />
								</button>
							</div>
						</div>
					</div>

					{/* Quick Actions */}
					<div>
						<h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
							Actions
						</h3>
						<div className="grid grid-cols-2 gap-3">
							<label className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:border-border transition-all cursor-pointer">
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
								type="button"
								onClick={handleDownload}
								className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:border-border transition-all"
							>
								<Download className="w-3.5 h-3.5" />
								{intl.formatMessage({
									id: 'media.viewDrawer.download',
									defaultMessage: 'Download',
								})}
							</button>
						</div>
						<p className="text-[10px] text-muted-foreground mt-2 px-1">
							Tip: Drag and drop a new file here to replace current version.
						</p>
					</div>

					{/* Metadata Form */}
					<div className="space-y-5">
						<div>
							<Label
								htmlFor="filename"
								className="text-xs font-medium text-muted-foreground mb-1.5"
							>
								{intl.formatMessage({
									id: 'media.viewDrawer.fileName',
									defaultMessage: 'File Name',
								})}
							</Label>
							<div className="relative">
								<Input
									type="text"
									id="filename"
									value={filename}
									onChange={(e) => setFilename(e.target.value)}
									className="block w-full rounded-md border-0 py-1.5 pl-3 pr-12 text-foreground shadow-sm ring-1 ring-inset ring-border placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:text-sm sm:leading-6"
								/>
								<div className="absolute inset-y-0 right-0 flex items-center pr-3">
									<span className="text-muted-foreground text-xs">
										.{asset.format}
									</span>
								</div>
							</div>
						</div>

						<div>
							<Label
								htmlFor="alt-text"
								className="text-xs font-medium text-muted-foreground mb-1.5"
							>
								{intl.formatMessage({
									id: 'media.viewDrawer.altText',
									defaultMessage: 'Alt Text',
								})}
							</Label>
							<Textarea
								id="alt-text"
								rows={2}
								value={altText}
								onChange={(e) => setAltText(e.target.value)}
								className="block w-full resize-none rounded-md border-0 py-1.5 pl-3 text-foreground shadow-sm ring-1 ring-inset ring-border placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:text-sm sm:leading-6"
								placeholder={intl.formatMessage({
									id: 'media.viewDrawer.altTextPlaceholder',
									defaultMessage: 'Describe this image for accessibility',
								})}
							/>
						</div>

						{/* Folder Context */}
						<div>
							<Label className="block text-xs font-medium text-muted-foreground mb-1.5">
								{intl.formatMessage({
									id: 'media.viewDrawer.location',
									defaultMessage: 'Location',
								})}
							</Label>
							<div className="flex items-center justify-between p-2 bg-muted/50 border border-border rounded-md">
								<div className="flex items-center gap-2 overflow-hidden">
									<div className="w-4 h-4 text-muted-foreground shrink-0">
										📁
									</div>
									<span className="text-xs text-muted-foreground truncate">
										{asset.location ||
											intl.formatMessage({
												id: 'media.viewDrawer.root',
												defaultMessage: 'Root',
											})}
									</span>
								</div>
								<button
									type="button"
									className="text-xs text-blue-600 font-medium hover:text-blue-700 whitespace-nowrap ml-2"
									onClick={() => setShowMoveSelect(!showMoveSelect)}
								>
									{intl.formatMessage({
										id: 'media.viewDrawer.moveTo',
										defaultMessage: 'Move to...',
									})}
								</button>
							</div>
							{showMoveSelect && folders && onMove && (
								<div className="mt-2 p-2 bg-background border border-border rounded-md space-y-1">
									<button
										type="button"
										className={cn(
											'w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors',
											!asset.location || asset.location === 'Root'
												? 'bg-muted font-medium'
												: '',
										)}
										onClick={() => {
											onMove(asset.id, '')
											setShowMoveSelect(false)
										}}
									>
										Root
									</button>
									{folders.map((folder) => (
										<button
											type="button"
											key={folder.id}
											className={cn(
												'w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors',
												asset.location === folder.path
													? 'bg-muted font-medium'
													: '',
											)}
											onClick={() => {
												onMove(asset.id, folder.path)
												setShowMoveSelect(false)
											}}
										>
											{folder.path}
										</button>
									))}
								</div>
							)}
							<button
								type="button"
								className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
								onClick={() => setShowSubfolderInput(!showSubfolderInput)}
							>
								<span className="text-xs">+</span>
								Create new subfolder
							</button>
							{showSubfolderInput && onCreateSubfolder && (
								<div className="mt-2 flex items-center gap-2">
									<Input
										type="text"
										value={subfolderName}
										onChange={(e) => setSubfolderName(e.target.value)}
										placeholder="Subfolder name"
										className="text-xs h-8 flex-1"
										onKeyDown={(e) => {
											if (e.key === 'Enter' && subfolderName.trim()) {
												const parentPath =
													asset.location && asset.location !== 'Root'
														? asset.location
														: undefined
												onCreateSubfolder(subfolderName.trim(), parentPath)
												setSubfolderName('')
												setShowSubfolderInput(false)
											}
										}}
									/>
									<Button
										size="sm"
										className="h-8 text-xs px-3"
										onClick={() => {
											if (subfolderName.trim()) {
												const parentPath =
													asset.location && asset.location !== 'Root'
														? asset.location
														: undefined
												onCreateSubfolder(subfolderName.trim(), parentPath)
												setSubfolderName('')
												setShowSubfolderInput(false)
											}
										}}
									>
										Create
									</Button>
								</div>
							)}
						</div>

						{/* Info Grid */}
						<div>
							<h4 className="text-xs font-medium text-foreground mb-3 border-t border-border pt-4">
								Information
							</h4>
							<dl className="grid grid-cols-2 gap-x-4 gap-y-4">
								<div>
									<dt className="text-[10px] text-muted-foreground uppercase tracking-wide">
										File Size
									</dt>
									<dd className="mt-0.5 text-xs font-medium text-foreground">
										{asset.size}
									</dd>
								</div>
								<div>
									<dt className="text-[10px] text-muted-foreground uppercase tracking-wide">
										Created
									</dt>
									<dd className="mt-0.5 text-xs font-medium text-foreground">
										{asset.createdAt ||
											intl.formatMessage({
												id: 'media.viewDrawer.unknown',
												defaultMessage: 'Unknown',
											})}
									</dd>
								</div>
								<div>
									<dt className="text-[10px] text-muted-foreground uppercase tracking-wide">
										Uploaded By
									</dt>
									<dd className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
										<div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[8px]">
											{asset.uploadedBy?.[0]?.toUpperCase() || 'U'}
										</div>
										{asset.uploadedBy ||
											intl.formatMessage({
												id: 'media.viewDrawer.unknown',
												defaultMessage: 'Unknown',
											})}
									</dd>
								</div>
								<div>
									<dt className="text-[10px] text-muted-foreground uppercase tracking-wide">
										Extension
									</dt>
									<dd className="mt-0.5 text-xs font-medium uppercase text-foreground">
										{asset.format}
									</dd>
								</div>
							</dl>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="shrink-0 border-t border-border p-4 bg-muted/50 flex justify-between items-center z-10">
					<Button
						type="button"
						variant="outline"
						onClick={handleDelete}
						className="border border-destructive/30 bg-background px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
					>
						{intl.formatMessage({
							id: 'media.viewDrawer.deleteAsset',
							defaultMessage: 'Delete',
						})}
					</Button>
					<Button
						type="button"
						onClick={handleSave}
						className="bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
					>
						{intl.formatMessage({
							id: 'common.actions.saveChanges',
							defaultMessage: 'Save Changes',
						})}
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	)
}
