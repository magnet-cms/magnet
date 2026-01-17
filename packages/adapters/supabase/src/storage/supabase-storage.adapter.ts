import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import {
	StorageAdapter,
	TransformOptions,
	UploadOptions,
	UploadResult,
} from '@magnet-cms/common'
import { SupabaseClient, createClient } from '@supabase/supabase-js'

/**
 * Supabase storage configuration
 */
export interface SupabaseStorageConfig {
	/** Supabase project URL */
	supabaseUrl: string
	/** Supabase service role key (required for storage operations) */
	supabaseKey: string
	/** Storage bucket name */
	bucket: string
	/** Public URL for the bucket (optional, uses Supabase URL if not provided) */
	publicUrl?: string
}

/**
 * Convert a Readable stream to a Buffer
 */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
	const chunks: Buffer[] = []
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
	}
	return Buffer.concat(chunks)
}

/**
 * Generate a unique filename with extension
 */
function generateFilename(originalFilename: string): string {
	const ext = originalFilename.split('.').pop() || ''
	const uuid = randomUUID()
	return ext ? `${uuid}.${ext}` : uuid
}

/**
 * Supabase Storage adapter for Magnet CMS.
 * Uses Supabase Storage for file management with image transformation support.
 *
 * @example
 * ```typescript
 * import { SupabaseStorageAdapter } from '@magnet-cms/adapter-supabase'
 *
 * const storage = new SupabaseStorageAdapter({
 *   supabaseUrl: process.env.SUPABASE_URL,
 *   supabaseKey: process.env.SUPABASE_SERVICE_KEY,
 *   bucket: 'media',
 * })
 *
 * await storage.initialize()
 * const result = await storage.upload(buffer, 'image.jpg', { folder: 'uploads' })
 * ```
 */
export class SupabaseStorageAdapter extends StorageAdapter {
	private supabase: SupabaseClient
	private config: SupabaseStorageConfig

	constructor(config: SupabaseStorageConfig) {
		super()
		this.config = config

		if (!config.supabaseUrl || !config.supabaseKey || !config.bucket) {
			throw new Error(
				'Supabase storage requires supabaseUrl, supabaseKey, and bucket in config',
			)
		}

		this.supabase = createClient(config.supabaseUrl, config.supabaseKey)
	}

	/**
	 * Initialize the storage adapter.
	 * Creates the bucket if it doesn't exist.
	 */
	async initialize(): Promise<void> {
		const { data: buckets } = await this.supabase.storage.listBuckets()
		const bucketExists = buckets?.some((b) => b.name === this.config.bucket)

		if (!bucketExists) {
			const { error } = await this.supabase.storage.createBucket(
				this.config.bucket,
				{ public: true },
			)
			if (error) {
				throw new Error(`Failed to create bucket: ${error.message}`)
			}
		}
	}

	/**
	 * Upload a file to Supabase Storage.
	 */
	async upload(
		file: Buffer | Readable,
		originalFilename: string,
		options?: UploadOptions,
	): Promise<UploadResult> {
		const buffer = Buffer.isBuffer(file) ? file : await streamToBuffer(file)
		const filename = options?.filename || generateFilename(originalFilename)
		const folder = options?.folder || ''
		const path = folder ? `${folder}/${filename}` : filename

		const { data, error } = await this.supabase.storage
			.from(this.config.bucket)
			.upload(path, buffer, {
				contentType: options?.mimeType,
				upsert: true,
			})

		if (error) {
			throw new Error(`Upload failed: ${error.message}`)
		}

		const url = this.getUrl(data.path)

		return {
			id: data.id || randomUUID(),
			filename,
			originalFilename,
			mimeType: options?.mimeType || 'application/octet-stream',
			size: buffer.length,
			path: data.path,
			url,
			folder: folder || undefined,
			tags: options?.tags,
			alt: options?.alt,
			customFields: options?.customFields,
			createdAt: new Date(),
			updatedAt: new Date(),
		}
	}

	/**
	 * Upload a file using streaming (converts to buffer for Supabase).
	 */
	async uploadChunked(
		stream: Readable,
		originalFilename: string,
		_totalSize: number,
		options?: UploadOptions,
	): Promise<UploadResult> {
		// Supabase doesn't support true streaming uploads, so we buffer the stream
		const buffer = await streamToBuffer(stream)
		return this.upload(buffer, originalFilename, options)
	}

	/**
	 * Delete a file from storage.
	 */
	async delete(path: string): Promise<boolean> {
		const { error } = await this.supabase.storage
			.from(this.config.bucket)
			.remove([path])

		if (error) {
			throw new Error(`Delete failed: ${error.message}`)
		}

		return true
	}

	/**
	 * Delete multiple files from storage.
	 */
	async deleteMany(
		paths: string[],
	): Promise<{ deleted: number; failed: string[] }> {
		const { error } = await this.supabase.storage
			.from(this.config.bucket)
			.remove(paths)

		if (error) {
			return { deleted: 0, failed: paths }
		}

		return { deleted: paths.length, failed: [] }
	}

	/**
	 * Get the public URL for a file.
	 * Supports image transformations via Supabase's image transformation API.
	 */
	getUrl(path: string, transform?: TransformOptions): string {
		if (transform && (transform.width || transform.height)) {
			// Use Supabase image transformation
			// Note: Supabase only supports 'origin' format, so we ignore other formats
			const { data } = this.supabase.storage
				.from(this.config.bucket)
				.getPublicUrl(path, {
					transform: {
						width: transform.width,
						height: transform.height,
						quality: transform.quality,
						resize: transform.fit as 'cover' | 'contain' | 'fill' | undefined,
					},
				})
			return data.publicUrl
		}

		const { data } = this.supabase.storage
			.from(this.config.bucket)
			.getPublicUrl(path)

		return data.publicUrl
	}

	/**
	 * Get a readable stream for a file.
	 */
	async getStream(path: string): Promise<Readable> {
		const { data, error } = await this.supabase.storage
			.from(this.config.bucket)
			.download(path)

		if (error || !data) {
			throw new Error(
				`Download failed: ${error?.message || 'No data returned'}`,
			)
		}

		// Convert Blob to Buffer and create stream
		const buffer = Buffer.from(await data.arrayBuffer())
		return Readable.from(buffer)
	}

	/**
	 * Get the file as a buffer.
	 */
	async getBuffer(path: string): Promise<Buffer> {
		const { data, error } = await this.supabase.storage
			.from(this.config.bucket)
			.download(path)

		if (error || !data) {
			throw new Error(
				`Download failed: ${error?.message || 'No data returned'}`,
			)
		}

		return Buffer.from(await data.arrayBuffer())
	}

	/**
	 * Check if a file exists.
	 */
	async exists(path: string): Promise<boolean> {
		const { data, error } = await this.supabase.storage
			.from(this.config.bucket)
			.list(path.split('/').slice(0, -1).join('/'), {
				search: path.split('/').pop(),
			})

		if (error) {
			return false
		}

		const filename = path.split('/').pop()
		return data?.some((file) => file.name === filename) || false
	}

	/**
	 * Get a transformed version of an image.
	 * Uses Supabase's built-in image transformation.
	 */
	async transform(path: string, options: TransformOptions): Promise<Buffer> {
		// Note: Supabase only supports 'origin' format, so we ignore other formats
		const { data } = this.supabase.storage
			.from(this.config.bucket)
			.getPublicUrl(path, {
				transform: {
					width: options.width,
					height: options.height,
					quality: options.quality,
					resize: options.fit as 'cover' | 'contain' | 'fill' | undefined,
				},
			})

		// Fetch the transformed image
		const response = await fetch(data.publicUrl)
		if (!response.ok) {
			throw new Error(`Transform failed: ${response.statusText}`)
		}

		return Buffer.from(await response.arrayBuffer())
	}

	/**
	 * Move/rename a file.
	 */
	async move(path: string, newPath: string): Promise<UploadResult> {
		const { error } = await this.supabase.storage
			.from(this.config.bucket)
			.move(path, newPath)

		if (error) {
			throw new Error(`Move failed: ${error.message}`)
		}

		const url = this.getUrl(newPath)
		const filename = newPath.split('/').pop() || newPath

		return {
			id: randomUUID(),
			filename,
			originalFilename: filename,
			mimeType: 'application/octet-stream',
			size: 0, // Size unknown after move
			path: newPath,
			url,
			createdAt: new Date(),
			updatedAt: new Date(),
		}
	}

	/**
	 * Copy a file.
	 */
	async copy(path: string, newPath: string): Promise<UploadResult> {
		const { error } = await this.supabase.storage
			.from(this.config.bucket)
			.copy(path, newPath)

		if (error) {
			throw new Error(`Copy failed: ${error.message}`)
		}

		const url = this.getUrl(newPath)
		const filename = newPath.split('/').pop() || newPath

		return {
			id: randomUUID(),
			filename,
			originalFilename: filename,
			mimeType: 'application/octet-stream',
			size: 0, // Size unknown after copy
			path: newPath,
			url,
			createdAt: new Date(),
			updatedAt: new Date(),
		}
	}

	/**
	 * Generate a signed URL for temporary access.
	 */
	async signedUrl(path: string, expiresIn = 3600): Promise<string> {
		const { data, error } = await this.supabase.storage
			.from(this.config.bucket)
			.createSignedUrl(path, expiresIn)

		if (error || !data) {
			throw new Error(
				`Signed URL failed: ${error?.message || 'No URL returned'}`,
			)
		}

		return data.signedUrl
	}

	/**
	 * Get the Supabase client for advanced usage.
	 */
	getSupabaseClient(): SupabaseClient {
		return this.supabase
	}
}
