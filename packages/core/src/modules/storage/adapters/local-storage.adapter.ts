import { randomUUID } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import type { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type {
	LocalStorageConfig,
	StorageAdapter,
	TransformOptions,
	UploadOptions,
	UploadResult,
} from '@magnet/common'
import { Logger } from '@nestjs/common'

// MIME type mappings
const MIME_TYPES: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.avif': 'image/avif',
	'.svg': 'image/svg+xml',
	'.pdf': 'application/pdf',
	'.mp4': 'video/mp4',
	'.webm': 'video/webm',
	'.mp3': 'audio/mpeg',
	'.wav': 'audio/wav',
	'.doc': 'application/msword',
	'.docx':
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'.xls': 'application/vnd.ms-excel',
	'.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'.zip': 'application/zip',
	'.json': 'application/json',
	'.txt': 'text/plain',
}

// Format to MIME type mapping for transforms
const FORMAT_MIME_TYPES: Record<string, string> = {
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	avif: 'image/avif',
}

export class LocalStorageAdapter implements StorageAdapter {
	private readonly logger = new Logger(LocalStorageAdapter.name)
	private readonly config: Required<LocalStorageConfig>
	private readonly cacheDir: string
	private sharp: typeof import('sharp') | null = null

	constructor(config: LocalStorageConfig) {
		this.config = {
			uploadDir: config.uploadDir || './uploads',
			publicPath: config.publicPath || '/media',
			maxFileSize: config.maxFileSize || 50 * 1024 * 1024, // 50MB
			allowedMimeTypes: config.allowedMimeTypes || [],
		}
		this.cacheDir = path.join(this.config.uploadDir, '.cache')
	}

	async initialize(): Promise<void> {
		// Create upload directory if it doesn't exist
		await fs.mkdir(this.config.uploadDir, { recursive: true })
		await fs.mkdir(this.cacheDir, { recursive: true })

		// Try to load sharp for image processing
		try {
			this.sharp = (await import('sharp')).default
			this.logger.log('Sharp image processor loaded')
		} catch {
			this.logger.warn(
				'Sharp not available - image transforms will be disabled',
			)
		}

		this.logger.log(`Local storage initialized at ${this.config.uploadDir}`)
	}

	async upload(
		file: Buffer | Readable,
		originalFilename: string,
		options?: UploadOptions,
	): Promise<UploadResult> {
		const id = randomUUID()
		const ext = path.extname(originalFilename).toLowerCase()
		const filename = options?.filename || `${id}${ext}`
		const folder = options?.folder || ''
		const targetDir = folder
			? path.join(this.config.uploadDir, folder)
			: this.config.uploadDir
		const filePath = path.join(targetDir, filename)

		// Ensure directory exists
		await fs.mkdir(targetDir, { recursive: true })

		// Convert to buffer if needed
		const buffer = Buffer.isBuffer(file)
			? file
			: await this.streamToBuffer(file)

		// Validate file size
		if (buffer.length > this.config.maxFileSize) {
			throw new Error(
				`File size exceeds limit of ${this.formatSize(this.config.maxFileSize)}`,
			)
		}

		// Validate MIME type if restrictions are set
		const mimeType = options?.mimeType || this.getMimeType(originalFilename)
		if (
			this.config.allowedMimeTypes.length > 0 &&
			!this.config.allowedMimeTypes.includes(mimeType)
		) {
			throw new Error(`File type ${mimeType} is not allowed`)
		}

		// Write file
		await fs.writeFile(filePath, buffer)

		// Get image dimensions if applicable
		let width: number | undefined
		let height: number | undefined
		if (this.sharp && this.isImage(mimeType)) {
			try {
				const metadata = await this.sharp(buffer).metadata()
				width = metadata.width
				height = metadata.height
			} catch {
				// Ignore errors for non-image files or corrupted images
			}
		}

		const relativePath = folder ? `${folder}/${filename}` : filename
		const url = `${this.config.publicPath}/${relativePath}`

		return {
			id,
			filename,
			originalFilename,
			mimeType,
			size: buffer.length,
			path: relativePath,
			url,
			folder: folder || undefined,
			tags: options?.tags,
			alt: options?.alt,
			width,
			height,
			customFields: options?.customFields,
			createdAt: new Date(),
			updatedAt: new Date(),
		}
	}

	async uploadChunked(
		stream: Readable,
		originalFilename: string,
		totalSize: number,
		options?: UploadOptions,
	): Promise<UploadResult> {
		const id = randomUUID()
		const ext = path.extname(originalFilename).toLowerCase()
		const filename = options?.filename || `${id}${ext}`
		const folder = options?.folder || ''
		const targetDir = folder
			? path.join(this.config.uploadDir, folder)
			: this.config.uploadDir
		const filePath = path.join(targetDir, filename)

		// Validate file size
		if (totalSize > this.config.maxFileSize) {
			throw new Error(
				`File size exceeds limit of ${this.formatSize(this.config.maxFileSize)}`,
			)
		}

		// Ensure directory exists
		await fs.mkdir(targetDir, { recursive: true })

		// Write stream to file
		const writeStream = createWriteStream(filePath)
		await pipeline(stream, writeStream)

		// Get actual file stats
		const stats = await fs.stat(filePath)
		const mimeType = options?.mimeType || this.getMimeType(originalFilename)

		// Get image dimensions if applicable
		let width: number | undefined
		let height: number | undefined
		if (this.sharp && this.isImage(mimeType)) {
			try {
				const metadata = await this.sharp(filePath).metadata()
				width = metadata.width
				height = metadata.height
			} catch {
				// Ignore errors
			}
		}

		const relativePath = folder ? `${folder}/${filename}` : filename
		const url = `${this.config.publicPath}/${relativePath}`

		return {
			id,
			filename,
			originalFilename,
			mimeType,
			size: stats.size,
			path: relativePath,
			url,
			folder: folder || undefined,
			tags: options?.tags,
			alt: options?.alt,
			width,
			height,
			customFields: options?.customFields,
			createdAt: new Date(),
			updatedAt: new Date(),
		}
	}

	async delete(storagePath: string): Promise<boolean> {
		try {
			const filePath = path.join(this.config.uploadDir, storagePath)
			await fs.unlink(filePath)

			// Also delete any cached transforms
			await this.deleteCachedTransforms(storagePath)

			return true
		} catch (error) {
			this.logger.error(`Failed to delete file: ${storagePath}`, error)
			return false
		}
	}

	async deleteMany(
		paths: string[],
	): Promise<{ deleted: number; failed: string[] }> {
		const failed: string[] = []
		let deleted = 0

		for (const storagePath of paths) {
			const success = await this.delete(storagePath)
			if (success) {
				deleted++
			} else {
				failed.push(storagePath)
			}
		}

		return { deleted, failed }
	}

	getUrl(storagePath: string, transform?: TransformOptions): string {
		let url = `${this.config.publicPath}/${storagePath}`

		if (transform) {
			const params = new URLSearchParams()
			if (transform.width) params.set('w', transform.width.toString())
			if (transform.height) params.set('h', transform.height.toString())
			if (transform.fit) params.set('fit', transform.fit)
			if (transform.format) params.set('f', transform.format)
			if (transform.quality) params.set('q', transform.quality.toString())

			const queryString = params.toString()
			if (queryString) {
				url += `?${queryString}`
			}
		}

		return url
	}

	async getStream(storagePath: string): Promise<Readable> {
		const filePath = path.join(this.config.uploadDir, storagePath)
		await this.ensureFileExists(filePath)
		return createReadStream(filePath)
	}

	async getBuffer(storagePath: string): Promise<Buffer> {
		const filePath = path.join(this.config.uploadDir, storagePath)
		return fs.readFile(filePath)
	}

	async exists(storagePath: string): Promise<boolean> {
		try {
			const filePath = path.join(this.config.uploadDir, storagePath)
			await fs.access(filePath)
			return true
		} catch {
			return false
		}
	}

	async transform(
		storagePath: string,
		options: TransformOptions,
	): Promise<Buffer> {
		if (!this.sharp) {
			throw new Error(
				'Image transforms are not available (sharp not installed)',
			)
		}

		// Check cache first
		const cacheKey = this.getCacheKey(storagePath, options)
		const cachePath = path.join(this.cacheDir, cacheKey)

		try {
			return await fs.readFile(cachePath)
		} catch {
			// Not in cache, generate transform
		}

		const buffer = await this.getBuffer(storagePath)
		let transformer = this.sharp(buffer)

		// Apply resize
		if (options.width || options.height) {
			transformer = transformer.resize(options.width, options.height, {
				fit: options.fit || 'cover',
				withoutEnlargement: true,
			})
		}

		// Apply format conversion
		if (options.format) {
			const quality = options.quality || 80
			switch (options.format) {
				case 'jpeg':
					transformer = transformer.jpeg({ quality })
					break
				case 'png':
					transformer = transformer.png({ quality })
					break
				case 'webp':
					transformer = transformer.webp({ quality })
					break
				case 'avif':
					transformer = transformer.avif({ quality })
					break
			}
		}

		const transformed = await transformer.toBuffer()

		// Cache the result
		try {
			await fs.mkdir(path.dirname(cachePath), { recursive: true })
			await fs.writeFile(cachePath, transformed)
		} catch (error) {
			this.logger.warn('Failed to cache transformed image', error)
		}

		return transformed
	}

	/**
	 * Get the MIME type for a transformed image
	 */
	getTransformMimeType(
		originalMimeType: string,
		transform?: TransformOptions,
	): string {
		if (transform?.format) {
			return FORMAT_MIME_TYPES[transform.format] || originalMimeType
		}
		return originalMimeType
	}

	// ============================================================================
	// Private Helper Methods
	// ============================================================================

	private async streamToBuffer(stream: Readable): Promise<Buffer> {
		const chunks: Buffer[] = []
		for await (const chunk of stream) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
		}
		return Buffer.concat(chunks)
	}

	private getMimeType(filename: string): string {
		const ext = path.extname(filename).toLowerCase()
		return MIME_TYPES[ext] || 'application/octet-stream'
	}

	private isImage(mimeType: string): boolean {
		return mimeType.startsWith('image/') && mimeType !== 'image/svg+xml'
	}

	private getCacheKey(storagePath: string, options: TransformOptions): string {
		const parts = [storagePath.replace(/\//g, '_')]
		if (options.width) parts.push(`w${options.width}`)
		if (options.height) parts.push(`h${options.height}`)
		if (options.fit) parts.push(`f${options.fit}`)
		if (options.format) parts.push(options.format)
		if (options.quality) parts.push(`q${options.quality}`)
		return parts.join('_')
	}

	private async deleteCachedTransforms(storagePath: string): Promise<void> {
		try {
			const prefix = storagePath.replace(/\//g, '_')
			const files = await fs.readdir(this.cacheDir)
			for (const file of files) {
				if (file.startsWith(prefix)) {
					await fs.unlink(path.join(this.cacheDir, file)).catch(() => {})
				}
			}
		} catch {
			// Ignore errors when cleaning cache
		}
	}

	private async ensureFileExists(filePath: string): Promise<void> {
		try {
			await fs.access(filePath)
		} catch {
			throw new Error(`File not found: ${filePath}`)
		}
	}

	private formatSize(bytes: number): string {
		if (bytes === 0) return '0 B'
		const k = 1024
		const sizes = ['B', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
	}
}
