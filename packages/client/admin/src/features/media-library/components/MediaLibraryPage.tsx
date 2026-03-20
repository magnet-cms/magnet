'use client'

import { Button, Skeleton } from '@magnet-cms/ui'
import { ArrowDown, FolderPlus, Upload } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { MediaItem } from '~/core/adapters/types'
import {
	useMediaCreateFolder,
	useMediaDelete,
	useMediaFolders,
	useMediaList,
	useMediaUpdate,
	useMediaUploadMultiple,
	useMediaUrl,
} from '~/hooks/useMedia'

import { useAppIntl } from '~/i18n'
import { PageHeader } from '../../shared'

import {
	AssetGrid,
	FolderGrid,
	MediaFilters,
	MediaViewDrawer,
	NewFolderDrawer,
	UploadAssetsDrawer,
} from './index'

// Local Asset type that components expect
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

// Folder type for FolderGrid
interface Folder {
	id: string
	name: string
	itemCount: number
}

/**
 * Format bytes to human-readable string
 */
function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes'
	const k = 1024
	const sizes = ['Bytes', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

/**
 * Get asset type from mimeType
 */
function getAssetType(mimeType: string): 'image' | 'video' | 'document' {
	if (mimeType.startsWith('image/')) return 'image'
	if (mimeType.startsWith('video/')) return 'video'
	return 'document'
}

/**
 * Get file format/extension from mimeType or filename
 */
function getFileFormat(mimeType: string, filename: string): string {
	// Try to get from filename extension
	const ext = filename.split('.').pop()?.toLowerCase()
	if (ext) return ext

	// Fallback to mime type mapping
	const mimeMap: Record<string, string> = {
		'image/jpeg': 'jpg',
		'image/png': 'png',
		'image/gif': 'gif',
		'image/webp': 'webp',
		'image/svg+xml': 'svg',
		'video/mp4': 'mp4',
		'video/webm': 'webm',
		'application/pdf': 'pdf',
		'application/msword': 'doc',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
			'docx',
	}

	return mimeMap[mimeType] || mimeType.split('/').pop() || 'unknown'
}

/**
 * Transform MediaItem from API to Asset for components
 */
function transformMediaToAsset(
	media: MediaItem,
	getUrl: (id: string) => string,
): Asset {
	return {
		id: media.id,
		name: media.originalFilename || media.filename,
		type: getAssetType(media.mimeType),
		url: getUrl(media.id),
		size: formatFileSize(media.size),
		format: getFileFormat(media.mimeType, media.filename),
		createdAt: media.createdAt
			? new Date(media.createdAt).toLocaleDateString()
			: undefined,
		uploadedBy: media.createdByName || media.createdBy,
		altText: media.alt,
		location: media.folder || 'Root',
		dimensions:
			media.width && media.height
				? `${media.width}x${media.height}`
				: undefined,
	}
}

export function MediaLibraryPage() {
	const intl = useAppIntl()
	// State
	const [searchQuery, setSearchQuery] = useState('')
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchQuery(searchQuery)
			setPage(1)
		}, 400)
		return () => clearTimeout(timer)
	}, [searchQuery])
	const [typeFilter, setTypeFilter] = useState('all')
	const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'size'>(
		'newest',
	)
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
	const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
	const [newFolderOpen, setNewFolderOpen] = useState(false)
	const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false)
	const [mediaViewOpen, setMediaViewOpen] = useState(false)
	const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
	const [currentFolder, setCurrentFolder] = useState<string | undefined>(
		undefined,
	)
	const [page, setPage] = useState(1)

	// Build query options
	const queryOptions = useMemo(() => {
		const mimeTypeMap: Record<string, string | undefined> = {
			all: undefined,
			images: 'image/',
			videos: 'video/',
			documents: undefined, // Documents need special handling
		}

		const sortMap: Record<string, 'createdAt' | 'filename' | 'size'> = {
			newest: 'createdAt',
			oldest: 'createdAt',
			name: 'filename',
			size: 'size',
		}

		return {
			page,
			limit: 24,
			folder: currentFolder,
			mimeType: mimeTypeMap[typeFilter],
			search: debouncedSearchQuery || undefined,
			sortBy: sortMap[sortBy],
			sortOrder: sortBy === 'oldest' ? ('asc' as const) : ('desc' as const),
		}
	}, [page, currentFolder, typeFilter, debouncedSearchQuery, sortBy])

	// Hooks
	const {
		data: mediaData,
		isLoading,
		error,
		refetch,
	} = useMediaList(queryOptions)
	const { data: folders } = useMediaFolders()
	const { mutate: uploadFiles, isPending: isUploading } =
		useMediaUploadMultiple()
	const { mutate: deleteMedia } = useMediaDelete()
	const { mutate: updateMedia } = useMediaUpdate()
	const { mutate: createFolder } = useMediaCreateFolder()
	const { getUrl, getThumbnailUrl } = useMediaUrl()

	// Transform folders for FolderGrid
	const transformedFolders: Folder[] = useMemo(() => {
		if (!folders) return []
		return folders.map((f) => ({
			id: f.id,
			name: f.name,
			itemCount: f.itemCount,
		}))
	}, [folders])

	// Transform media items to assets
	const assets: Asset[] = useMemo(() => {
		if (!mediaData?.items) return []
		return mediaData.items
			.filter((item) => {
				// Additional client-side filtering for documents (non-image, non-video)
				if (typeFilter === 'documents') {
					return (
						!item.mimeType.startsWith('image/') &&
						!item.mimeType.startsWith('video/')
					)
				}
				return true
			})
			.map((item) => transformMediaToAsset(item, getThumbnailUrl))
	}, [mediaData?.items, typeFilter, getThumbnailUrl])

	// Handlers
	const handleAssetSelect = useCallback((assetId: string) => {
		setSelectedAssetIds((prev) =>
			prev.includes(assetId)
				? prev.filter((id) => id !== assetId)
				: [...prev, assetId],
		)
	}, [])

	const handleUpload = useCallback(
		(files: File[]) => {
			uploadFiles(
				{ files, options: { folder: currentFolder } },
				{
					onSuccess: () => {
						toast.success(
							intl.formatMessage(
								{
									id: 'media.uploadSuccess',
									defaultMessage:
										'Uploaded {count, plural, one {# file} other {# files}} successfully',
								},
								{ count: files.length },
							),
						)
						setUploadDrawerOpen(false)
						refetch()
					},
					onError: (err) => {
						toast.error(
							err.message ||
								intl.formatMessage({
									id: 'media.uploadError',
									defaultMessage: 'Failed to upload files',
								}),
						)
					},
				},
			)
		},
		[uploadFiles, currentFolder, refetch],
	)

	const handleCreateFolder = useCallback(
		(name: string) => {
			createFolder(
				{ name, parentPath: currentFolder },
				{
					onSuccess: () => {
						toast.success(
							intl.formatMessage(
								{
									id: 'media.folderCreated',
									defaultMessage: 'Folder "{name}" created successfully',
								},
								{ name },
							),
						)
						setNewFolderOpen(false)
					},
					onError: (err) => {
						toast.error(
							err.message ||
								intl.formatMessage({
									id: 'media.folderCreateError',
									defaultMessage: 'Failed to create folder',
								}),
						)
					},
				},
			)
		},
		[createFolder, currentFolder],
	)

	const handleFolderClick = useCallback(
		(folderId: string) => {
			// Find from the original folders data (has path info)
			const folder = folders?.find((f) => f.id === folderId)
			if (folder) {
				setCurrentFolder(folder.path)
				setPage(1)
			}
		},
		[folders],
	)

	const handleAssetView = useCallback(
		(id: string) => {
			const mediaItem = mediaData?.items.find((item) => item.id === id)
			if (mediaItem) {
				setSelectedAsset(transformMediaToAsset(mediaItem, getUrl))
				setMediaViewOpen(true)
			}
		},
		[mediaData?.items, getUrl],
	)

	const handleAssetDownload = useCallback(
		(id: string) => {
			const url = getUrl(id)
			if (url) {
				window.open(url, '_blank')
			}
		},
		[getUrl],
	)

	const handleAssetDelete = useCallback(
		(id: string) => {
			deleteMedia(id, {
				onSuccess: () => {
					toast.success(
						intl.formatMessage({
							id: 'media.assetDeleted',
							defaultMessage: 'Asset deleted successfully',
						}),
					)
					setMediaViewOpen(false)
					setSelectedAsset(null)
					refetch()
				},
				onError: (err) => {
					toast.error(
						err.message ||
							intl.formatMessage({
								id: 'media.assetDeleteError',
								defaultMessage: 'Failed to delete asset',
							}),
					)
				},
			})
		},
		[deleteMedia, refetch],
	)

	const handleAssetSave = useCallback(
		(updates: { id: string; name?: string; altText?: string }) => {
			updateMedia(
				{
					id: updates.id,
					data: { alt: updates.altText },
				},
				{
					onSuccess: () => {
						toast.success(
							intl.formatMessage({
								id: 'media.assetUpdated',
								defaultMessage: 'Asset updated successfully',
							}),
						)
						refetch()
					},
					onError: (err) => {
						toast.error(
							err.message ||
								intl.formatMessage({
									id: 'media.assetUpdateError',
									defaultMessage: 'Failed to update asset',
								}),
						)
					},
				},
			)
		},
		[updateMedia, refetch],
	)

	const handleLoadMore = useCallback(() => {
		if (mediaData && page < mediaData.totalPages) {
			setPage((p) => p + 1)
		}
	}, [mediaData, page])

	const handleSortChange = useCallback((sort: string) => {
		if (
			sort === 'newest' ||
			sort === 'oldest' ||
			sort === 'name' ||
			sort === 'size'
		) {
			setSortBy(sort)
		}
	}, [])

	// Loading state
	if (isLoading && !mediaData) {
		return (
			<div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
				<PageHeader>
					<div className="h-16 flex items-center justify-between px-6">
						<div>
							<Skeleton className="h-6 w-32 mb-1" />
							<Skeleton className="h-4 w-64" />
						</div>
						<div className="flex items-center gap-3">
							<Skeleton className="h-9 w-24" />
							<Skeleton className="h-9 w-28" />
						</div>
					</div>
				</PageHeader>
				<div className="flex-1 flex flex-col overflow-hidden bg-muted p-6">
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
						{[
							's1',
							's2',
							's3',
							's4',
							's5',
							's6',
							's7',
							's8',
							's9',
							's10',
							's11',
							's12',
						].map((id) => (
							<Skeleton key={id} className="aspect-square rounded-lg" />
						))}
					</div>
				</div>
			</div>
		)
	}

	// Error state
	if (error) {
		return (
			<div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
				<PageHeader>
					<div className="h-16 flex items-center justify-between px-6">
						<div>
							<h1 className="text-lg font-semibold text-foreground tracking-tight">
								{intl.formatMessage({
									id: 'media.title',
									defaultMessage: 'Media Library',
								})}
							</h1>
							<p className="text-xs text-muted-foreground">
								{intl.formatMessage({
									id: 'media.subtitle',
									defaultMessage:
										"Manage and organize your project's digital assets.",
								})}
							</p>
						</div>
					</div>
				</PageHeader>
				<div className="flex-1 flex items-center justify-center bg-muted">
					<div className="text-center">
						<p className="text-muted-foreground mb-4">
							{error.message ||
								intl.formatMessage({
									id: 'media.failedToLoad',
									defaultMessage: 'Failed to load media',
								})}
						</p>
						<Button onClick={() => refetch()}>
							{intl.formatMessage({
								id: 'common.actions.retry',
								defaultMessage: 'Retry',
							})}
						</Button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
			{/* Header */}
			<PageHeader>
				{/* Toolbar: Title & Actions */}
				<div className="h-16 flex items-center justify-between px-6">
					<div>
						<h1 className="text-lg font-semibold text-foreground tracking-tight">
							{intl.formatMessage({
								id: 'media.title',
								defaultMessage: 'Media Library',
							})}
							{currentFolder && (
								<span className="text-muted-foreground font-normal">
									{' '}
									/ {currentFolder}
								</span>
							)}
						</h1>
						<p className="text-xs text-muted-foreground">
							{intl.formatMessage(
								{ id: 'media.assetCount', defaultMessage: '{count} assets' },
								{ count: mediaData?.total || 0 },
							)}
							{currentFolder && (
								<button
									type="button"
									onClick={() => {
										setCurrentFolder(undefined)
										setPage(1)
									}}
									className="ml-2 text-blue-600 hover:text-blue-700 cursor-pointer"
								>
									{intl.formatMessage({
										id: 'media.backToAll',
										defaultMessage: '← Back to all',
									})}
								</button>
							)}
						</p>
					</div>

					<div className="flex items-center gap-3">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setNewFolderOpen(true)}
						>
							<FolderPlus className="w-3.5 h-3.5" />
							{intl.formatMessage({
								id: 'media.newFolder',
								defaultMessage: 'New Folder',
							})}
						</Button>
						<Button
							size="sm"
							onClick={() => setUploadDrawerOpen(true)}
							disabled={isUploading}
						>
							<Upload className="w-3.5 h-3.5 mr-2" />
							{isUploading
								? intl.formatMessage({
										id: 'media.uploading',
										defaultMessage: 'Uploading...',
									})
								: intl.formatMessage({
										id: 'media.uploadAssets',
										defaultMessage: 'Upload Assets',
									})}
						</Button>
					</div>
				</div>
			</PageHeader>

			{/* Main Workspace */}
			<div className="flex-1 flex flex-col overflow-hidden bg-muted">
				<MediaFilters
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					typeFilter={typeFilter}
					onTypeFilterChange={setTypeFilter}
					sortBy={sortBy}
					onSortChange={handleSortChange}
					viewMode={viewMode}
					onViewModeChange={setViewMode}
				/>

				{/* Content Grid */}
				<div className="flex-1 overflow-auto px-6 py-6">
					{/* Folders */}
					{!currentFolder && transformedFolders.length > 0 && (
						<FolderGrid
							folders={transformedFolders}
							onFolderClick={handleFolderClick}
						/>
					)}

					{/* Assets */}
					<div>
						<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
							{intl.formatMessage({
								id: 'media.assets',
								defaultMessage: 'Assets',
							})}
						</h3>
						{assets.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
									<Upload className="w-8 h-8 text-muted-foreground" />
								</div>
								<p className="text-muted-foreground mb-2">
									{intl.formatMessage({
										id: 'media.noAssets',
										defaultMessage: 'No assets found',
									})}
								</p>
								<p className="text-xs text-muted-foreground mb-4">
									{searchQuery
										? intl.formatMessage({
												id: 'media.searchHint',
												defaultMessage: 'Try a different search term',
											})
										: intl.formatMessage({
												id: 'media.uploadFirstAsset',
												defaultMessage:
													'Upload your first asset to get started',
											})}
								</p>
								<Button size="sm" onClick={() => setUploadDrawerOpen(true)}>
									<Upload className="w-3.5 h-3.5 mr-2" />
									{intl.formatMessage({
										id: 'media.uploadAssets',
										defaultMessage: 'Upload Assets',
									})}
								</Button>
							</div>
						) : (
							<AssetGrid
								assets={assets}
								selectedIds={selectedAssetIds}
								onAssetSelect={handleAssetSelect}
								onAssetView={handleAssetView}
								onAssetDownload={handleAssetDownload}
								viewMode={viewMode}
							/>
						)}
					</div>

					{/* Load More */}
					{mediaData && page < mediaData.totalPages && (
						<div className="flex items-center justify-center py-8">
							<Button
								variant="outline"
								size="sm"
								onClick={handleLoadMore}
								disabled={isLoading}
							>
								{isLoading
									? intl.formatMessage({
											id: 'common.actions.loading',
											defaultMessage: 'Loading...',
										})
									: intl.formatMessage({
											id: 'media.loadMore',
											defaultMessage: 'Load More Assets',
										})}
								<ArrowDown className="w-3 h-3" />
							</Button>
						</div>
					)}
				</div>
			</div>

			{/* Drawers */}
			<NewFolderDrawer
				open={newFolderOpen}
				onOpenChange={setNewFolderOpen}
				onCreate={handleCreateFolder}
			/>
			<UploadAssetsDrawer
				open={uploadDrawerOpen}
				onOpenChange={setUploadDrawerOpen}
				onUpload={handleUpload}
			/>
			<MediaViewDrawer
				open={mediaViewOpen}
				onOpenChange={setMediaViewOpen}
				asset={selectedAsset}
				folders={folders?.map((f) => ({
					id: f.id,
					name: f.name,
					path: f.path,
					itemCount: f.itemCount,
				}))}
				onDownload={handleAssetDownload}
				onDelete={handleAssetDelete}
				onSave={handleAssetSave}
				onMove={(assetId, folder) => {
					updateMedia(
						{ id: assetId, data: { folder: folder || undefined } },
						{
							onSuccess: () => {
								toast.success(
									intl.formatMessage({
										id: 'media.fileMoved',
										defaultMessage: 'File moved successfully',
									}),
								)
								refetch()
							},
							onError: (err) => {
								toast.error(
									err.message ||
										intl.formatMessage({
											id: 'media.fileMoveError',
											defaultMessage: 'Failed to move file',
										}),
								)
							},
						},
					)
				}}
				onCreateSubfolder={(name, parentPath) => {
					createFolder(
						{ name, parentPath },
						{
							onSuccess: () => {
								toast.success(
									intl.formatMessage(
										{
											id: 'media.subfolderCreated',
											defaultMessage: 'Subfolder "{name}" created',
										},
										{ name },
									),
								)
							},
							onError: (err) => {
								toast.error(
									err.message ||
										intl.formatMessage({
											id: 'media.subfolderCreateError',
											defaultMessage: 'Failed to create subfolder',
										}),
								)
							},
						},
					)
				}}
			/>
		</div>
	)
}
