import type { Readable } from 'node:stream'
import {
	type MediaQueryOptions,
	Model,
	type PaginatedMedia,
	type StorageAdapter,
	type TransformOptions,
	type UploadOptions,
} from '@magnet-cms/common'
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { Media } from './schemas/media.schema'
import { STORAGE_ADAPTER } from './storage.constants'

@Injectable()
export class StorageService implements OnModuleInit {
	private readonly logger = new Logger(StorageService.name)
	private mediaModel: Model<Media> | null = null

	constructor(
		@Inject(STORAGE_ADAPTER)
		private readonly adapter: StorageAdapter,
		private readonly moduleRef: ModuleRef,
	) {}

	async onModuleInit() {
		await this.adapter.initialize()
		this.logger.log('Storage service initialized')
	}

	/**
	 * Get the Media model lazily
	 */
	private getMediaModel(): Model<Media> {
		if (!this.mediaModel) {
			try {
				this.mediaModel = this.moduleRef.get<Model<Media>>('MagnetMediaModel', {
					strict: false,
				})
			} catch {
				throw new Error(
					'Media model not found. Make sure the Media schema is registered.',
				)
			}
		}
		return this.mediaModel
	}

	/**
	 * Upload a file and store its metadata
	 */
	async upload(
		file: Buffer | Readable,
		originalFilename: string,
		options?: UploadOptions & { createdBy?: string },
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
		})

		return media
	}

	/**
	 * Upload multiple files
	 */
	async uploadMany(
		files: Array<{ file: Buffer | Readable; originalFilename: string }>,
		options?: UploadOptions & { createdBy?: string },
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
		data: Partial<Pick<Media, 'alt' | 'tags' | 'folder' | 'customFields'>>,
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
	 * Get all unique folders
	 */
	async getFolders(): Promise<string[]> {
		const model = this.getMediaModel()
		const media = await model.find()
		const folders = new Set<string>()

		for (const m of media) {
			if (m.folder) {
				folders.add(m.folder)
			}
		}

		return Array.from(folders).sort()
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
