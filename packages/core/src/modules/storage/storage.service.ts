import type { Readable } from 'node:stream'
import {
	type MediaQueryOptions,
	Model,
	type PaginatedMedia,
	type StorageAdapter,
	type TransformOptions,
	type UploadOptions,
	getModelToken,
} from '@magnet-cms/common'
import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { EventService, getEventContext } from '~/modules/events'
import { MagnetLogger } from '~/modules/logging/logger.service'
import { MediaFolder } from './schemas/media-folder.schema'
import { Media } from './schemas/media.schema'
import { STORAGE_ADAPTER } from './storage.constants'

export interface FolderInfo {
	id: string
	name: string
	path: string
	parentPath?: string
	createdBy?: string
	createdByName?: string
	itemCount: number
	createdAt: Date
}

@Injectable()
export class StorageService implements OnModuleInit {
	private mediaModel: Model<Media> | null = null
	private folderModel: Model<MediaFolder> | null = null

	constructor(
		@Inject(STORAGE_ADAPTER)
		private readonly adapter: StorageAdapter,
		private readonly moduleRef: ModuleRef,
		private readonly eventService: EventService,
		private readonly logger: MagnetLogger,
	) {
		this.logger.setContext(StorageService.name)
	}

	async onModuleInit() {
		await this.adapter.initialize()
		this.logger.log('Storage service initialized')
	}

	/**
	 * Emit an event with error isolation
	 */
	private async emitEvent(
		event: Parameters<EventService['emit']>[0],
		payload: Parameters<EventService['emit']>[1],
	): Promise<void> {
		try {
			const context = getEventContext()
			await this.eventService.emit(event, payload, context)
		} catch (error) {
			this.logger.warn(
				`Failed to emit event ${event}: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	/**
	 * Resolve a user's display name by ID using lazy UserService lookup
	 */
	private async resolveUserName(
		userId: string | undefined,
	): Promise<string | undefined> {
		if (!userId) return undefined
		try {
			const userService = this.moduleRef.get('UserService', {
				strict: false,
			})
			const user = await userService.findOneById(userId)
			return (user as { name?: string } | null)?.name
		} catch {
			this.logger.warn(`Failed to resolve user name for ${userId}`)
			return undefined
		}
	}

	/**
	 * Get the Media model lazily
	 */
	private getMediaModel(): Model<Media> {
		if (!this.mediaModel) {
			try {
				this.mediaModel = this.moduleRef.get<Model<Media>>(
					getModelToken(Media),
					{ strict: false },
				)
			} catch {
				throw new Error(
					'Media model not found. Make sure the Media schema is registered.',
				)
			}
		}
		return this.mediaModel
	}

	/**
	 * Get the MediaFolder model lazily
	 */
	private getFolderModel(): Model<MediaFolder> {
		if (!this.folderModel) {
			try {
				this.folderModel = this.moduleRef.get<Model<MediaFolder>>(
					getModelToken(MediaFolder),
					{ strict: false },
				)
			} catch {
				throw new Error(
					'MediaFolder model not found. Make sure the MediaFolder schema is registered.',
				)
			}
		}
		return this.folderModel
	}

	// -------------------------------------------------------------------------
	// Folder operations
	// -------------------------------------------------------------------------

	/**
	 * Create a folder. Builds the path from name and optional parentPath.
	 */
	async createFolder(
		name: string,
		parentPath?: string,
		createdBy?: string,
		createdByName?: string,
	): Promise<MediaFolder> {
		const folderModel = this.getFolderModel()
		const path = parentPath ? `${parentPath}/${name}` : name

		// Check parent exists if specified
		if (parentPath) {
			const parent = await folderModel.findOne({ path: parentPath })
			if (!parent) {
				throw new Error(`Parent folder "${parentPath}" not found`)
			}
		}

		// Check for duplicate path
		const existing = await folderModel.findOne({ path })
		if (existing) {
			throw new Error(`Folder "${path}" already exists`)
		}

		const folder = await folderModel.create({
			name,
			path,
			parentPath,
			createdBy,
			createdByName,
			createdAt: new Date(),
		})

		await this.emitEvent('media.folder_created', {
			folderId: (folder as unknown as { id: string }).id,
			folderName: name,
			parentFolder: parentPath,
		})

		return folder
	}

	/**
	 * Delete a folder. Only allowed if no media files are in it.
	 */
	async deleteFolder(path: string): Promise<boolean> {
		const folderModel = this.getFolderModel()
		const mediaModel = this.getMediaModel()

		const folder = await folderModel.findOne({ path })
		if (!folder) {
			return false
		}

		// Reject if folder has files
		const filesInFolder = await mediaModel.findMany({ folder: path })
		if (filesInFolder.length > 0) {
			throw new Error(
				`Cannot delete folder "${path}": it contains ${filesInFolder.length} file(s)`,
			)
		}

		// Reject if folder has subfolders
		const subfolders = await folderModel.findOne({ parentPath: path })
		if (subfolders) {
			throw new Error(`Cannot delete folder "${path}": it contains subfolders`)
		}

		await folderModel.delete({ id: folder.id } as Partial<MediaFolder>)

		await this.emitEvent('media.folder_deleted', {
			folderId: folder.id as unknown as string,
			folderName: folder.name,
			parentFolder: folder.parentPath,
		})

		return true
	}

	/**
	 * Get all folders with item counts, merging explicit MediaFolder records
	 * with folder strings found on media items.
	 */
	async getFoldersWithCounts(): Promise<FolderInfo[]> {
		const folderModel = this.getFolderModel()
		const mediaModel = this.getMediaModel()

		// Get explicit folders
		const explicitFolders = await folderModel.find()

		// Get all media to count items per folder
		const allMedia = await mediaModel.find()
		const folderCounts = new Map<string, number>()
		for (const m of allMedia) {
			if (m.folder) {
				folderCounts.set(m.folder, (folderCounts.get(m.folder) || 0) + 1)
			}
		}

		// Build result from explicit folders
		const folderMap = new Map<string, FolderInfo>()
		for (const f of explicitFolders) {
			folderMap.set(f.path, {
				id: (f as unknown as { id: string }).id,
				name: f.name,
				path: f.path,
				parentPath: f.parentPath,
				createdBy: f.createdBy,
				createdByName: f.createdByName,
				itemCount: folderCounts.get(f.path) || 0,
				createdAt: f.createdAt,
			})
		}

		// Add implicit folders (from media items) that don't have explicit records
		for (const [folderPath, count] of folderCounts) {
			if (!folderMap.has(folderPath)) {
				const parts = folderPath.split('/')
				const name = parts[parts.length - 1] || folderPath
				const parentPath =
					parts.length > 1 ? parts.slice(0, -1).join('/') : undefined
				folderMap.set(folderPath, {
					id: `implicit-${folderPath}`,
					name,
					path: folderPath,
					parentPath,
					itemCount: count,
					createdAt: new Date(),
				})
			}
		}

		return Array.from(folderMap.values()).sort((a, b) =>
			a.path.localeCompare(b.path),
		)
	}

	/**
	 * Upload a file and store its metadata
	 */
	async upload(
		file: Buffer | Readable,
		originalFilename: string,
		options?: UploadOptions & {
			createdBy?: string
			createdByName?: string
		},
	): Promise<Media> {
		const model = this.getMediaModel()

		// Upload to storage adapter
		const result = await this.adapter.upload(file, originalFilename, options)

		// Save metadata to database
		const media = await model.create({
			filename: result.filename,
			originalFilename: result.originalFilename,
			mimeType: result.mimeType,
			size: result.size,
			path: result.path,
			url: result.url,
			folder: result.folder,
			tags: result.tags || [],
			alt: result.alt,
			width: result.width,
			height: result.height,
			customFields: result.customFields,
			createdBy: options?.createdBy,
			createdByName: options?.createdByName,
		})

		await this.emitEvent('media.uploaded', {
			fileId: (media as unknown as { id: string }).id,
			filename: media.filename,
			mimeType: media.mimeType,
			size: media.size,
			folder: media.folder,
		})

		return media
	}

	/**
	 * Upload multiple files
	 */
	async uploadMany(
		files: Array<{ file: Buffer | Readable; originalFilename: string }>,
		options?: UploadOptions & {
			createdBy?: string
			createdByName?: string
		},
	): Promise<Media[]> {
		const results: Media[] = []

		for (const { file, originalFilename } of files) {
			const media = await this.upload(file, originalFilename, options)
			results.push(media)
		}

		return results
	}

	/**
	 * Upload a large file using chunked/streaming upload
	 */
	async uploadChunked(
		stream: Readable,
		originalFilename: string,
		totalSize: number,
		options?: UploadOptions & { createdBy?: string },
	): Promise<Media> {
		const model = this.getMediaModel()

		const result = await this.adapter.uploadChunked(
			stream,
			originalFilename,
			totalSize,
			options,
		)

		const media = await model.create({
			filename: result.filename,
			originalFilename: result.originalFilename,
			mimeType: result.mimeType,
			size: result.size,
			path: result.path,
			url: result.url,
			folder: result.folder,
			tags: result.tags || [],
			alt: result.alt,
			width: result.width,
			height: result.height,
			customFields: result.customFields,
			createdBy: options?.createdBy,
		})

		return media
	}

	/**
	 * Delete a media file and its metadata
	 */
	async delete(id: string): Promise<boolean> {
		const model = this.getMediaModel()
		const media = await model.findById(id)
		if (!media) {
			return false
		}

		// Delete from storage
		const deleted = await this.adapter.delete(media.path)
		if (!deleted) {
			this.logger.warn(`Failed to delete file from storage: ${media.path}`)
		}

		// Delete metadata from database
		await model.delete({ id })

		await this.emitEvent('media.deleted', {
			fileId: id,
			filename: media.filename,
			mimeType: media.mimeType,
			size: media.size,
			folder: media.folder,
		})

		return true
	}

	/**
	 * Delete multiple media files
	 */
	async deleteMany(
		ids: string[],
	): Promise<{ deleted: number; failed: string[] }> {
		const failed: string[] = []
		let deleted = 0

		for (const id of ids) {
			const success = await this.delete(id)
			if (success) {
				deleted++
			} else {
				failed.push(id)
			}
		}

		return { deleted, failed }
	}

	/**
	 * Find media by ID
	 */
	async findById(id: string): Promise<Media | null> {
		const model = this.getMediaModel()
		return model.findById(id)
	}

	/**
	 * Find media by filename
	 */
	async findByFilename(filename: string): Promise<Media | null> {
		const model = this.getMediaModel()
		return model.findOne({ filename })
	}

	/**
	 * Find media by path
	 */
	async findByPath(path: string): Promise<Media | null> {
		const model = this.getMediaModel()
		return model.findOne({ path })
	}

	/**
	 * List media with pagination and filtering
	 */
	async list(options?: MediaQueryOptions): Promise<PaginatedMedia<Media>> {
		const model = this.getMediaModel()
		const page = options?.page || 1
		const limit = options?.limit || 20

		// Build query
		const query: Record<string, unknown> = {}

		if (options?.folder) {
			query.folder = options.folder
		}

		if (options?.mimeType) {
			// Support partial match for MIME types (e.g., "image" matches "image/jpeg")
			query.mimeType = { $regex: options.mimeType, $options: 'i' }
		}

		if (options?.tags?.length) {
			query.tags = { $in: options.tags }
		}

		if (options?.search) {
			query.$or = [
				{ originalFilename: { $regex: options.search, $options: 'i' } },
				{ alt: { $regex: options.search, $options: 'i' } },
			]
		}

		// Get all items matching the query
		const allItems = await model.findMany(query)

		// Sort items
		const sortBy = options?.sortBy || 'createdAt'
		const sortOrder = options?.sortOrder || 'desc'
		const sortedItems = allItems.sort((a, b) => {
			const aVal = a[sortBy as keyof Media]
			const bVal = b[sortBy as keyof Media]

			if (aVal === undefined || bVal === undefined) return 0

			if (sortOrder === 'asc') {
				return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
			}
			return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
		})

		// Paginate
		const total = sortedItems.length
		const totalPages = Math.ceil(total / limit)
		const startIndex = (page - 1) * limit
		const items = sortedItems.slice(startIndex, startIndex + limit)

		return {
			items,
			total,
			page,
			limit,
			totalPages,
		}
	}

	/**
	 * Update media metadata
	 */
	async update(
		id: string,
		data: Partial<
			Pick<Media, 'alt' | 'tags' | 'folder' | 'customFields' | 'createdByName'>
		>,
	): Promise<Media | null> {
		const model = this.getMediaModel()
		const media = await model.findById(id)
		if (!media) {
			return null
		}

		return model.update({ id }, { ...data, updatedAt: new Date() })
	}

	/**
	 * Get the public URL for a media file
	 */
	getUrl(media: Media, transform?: TransformOptions): string {
		return this.adapter.getUrl(media.path, transform)
	}

	/**
	 * Get a readable stream for a media file
	 */
	async getStream(id: string): Promise<Readable> {
		const model = this.getMediaModel()
		const media = await model.findById(id)
		if (!media) {
			throw new Error('Media not found')
		}
		return this.adapter.getStream(media.path)
	}

	/**
	 * Get a media file as a buffer
	 */
	async getBuffer(id: string): Promise<Buffer> {
		const model = this.getMediaModel()
		const media = await model.findById(id)
		if (!media) {
			throw new Error('Media not found')
		}
		return this.adapter.getBuffer(media.path)
	}

	/**
	 * Get a transformed version of an image
	 */
	async transform(id: string, options: TransformOptions): Promise<Buffer> {
		const model = this.getMediaModel()
		const media = await model.findById(id)
		if (!media) {
			throw new Error('Media not found')
		}
		return this.adapter.transform(media.path, options)
	}

	/**
	 * Check if a media file exists
	 */
	async exists(id: string): Promise<boolean> {
		const model = this.getMediaModel()
		const media = await model.findById(id)
		if (!media) {
			return false
		}
		return this.adapter.exists(media.path)
	}

	/**
	 * Get all unique folders (enriched with counts).
	 * Returns FolderInfo[] merging explicit folders and implicit ones from media items.
	 */
	async getFolders(): Promise<FolderInfo[]> {
		return this.getFoldersWithCounts()
	}

	/**
	 * Get all unique tags
	 */
	async getTags(): Promise<string[]> {
		const model = this.getMediaModel()
		const media = await model.find()
		const tags = new Set<string>()

		for (const m of media) {
			if (m.tags) {
				for (const tag of m.tags) {
					tags.add(tag)
				}
			}
		}

		return Array.from(tags).sort()
	}

	/**
	 * Get storage statistics
	 */
	async getStats(): Promise<{
		totalFiles: number
		totalSize: number
		byMimeType: Record<string, { count: number; size: number }>
	}> {
		const model = this.getMediaModel()
		const media = await model.find()

		const stats = {
			totalFiles: media.length,
			totalSize: 0,
			byMimeType: {} as Record<string, { count: number; size: number }>,
		}

		for (const m of media) {
			stats.totalSize += m.size

			const mimeCategory = m.mimeType.split('/')[0] || 'other'
			if (!stats.byMimeType[mimeCategory]) {
				stats.byMimeType[mimeCategory] = { count: 0, size: 0 }
			}
			stats.byMimeType[mimeCategory].count++
			stats.byMimeType[mimeCategory].size += m.size
		}

		return stats
	}
}
