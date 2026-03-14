import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import {
	CopyObjectCommand,
	DeleteObjectsCommand,
	GetObjectCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
	type R2StorageConfig,
	StorageAdapter,
	type TransformOptions,
	type UploadOptions,
	type UploadResult,
} from '@magnet-cms/common'

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
 * R2 Storage adapter for Magnet CMS.
 * Uses Cloudflare R2 (S3-compatible) for file storage.
 *
 * @example
 * ```typescript
 * import { R2StorageAdapter } from '@magnet-cms/adapter-storage-r2'
 *
 * const storage = new R2StorageAdapter({
 *   bucket: 'my-bucket',
 *   region: 'auto',
 *   accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
 *   accessKeyId: process.env.R2_ACCESS_KEY_ID,
 *   secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
 *   publicUrl: 'https://pub-xxx.r2.dev',
 * })
 * ```
 */
export class R2StorageAdapter extends StorageAdapter {
	private readonly client: S3Client
	private readonly config: R2StorageConfig
	private readonly bucket: string

	constructor(config: R2StorageConfig) {
		super()
		this.config = config
		this.bucket = config.bucket

		const endpoint =
			config.endpoint || `https://${config.accountId}.r2.cloudflarestorage.com`

		this.client = new S3Client({
			region: config.region || 'auto',
			credentials: {
				accessKeyId: config.accessKeyId,
				secretAccessKey: config.secretAccessKey,
			},
			endpoint,
			forcePathStyle: config.forcePathStyle ?? true,
		})
	}

	private getKey(path: string): string {
		return path
	}

	private getPublicUrl(key: string): string {
		if (this.config.publicUrl) {
			return `${this.config.publicUrl.replace(/\/$/, '')}/${key}`
		}
		// R2 requires publicUrl or custom domain for public access
		throw new Error(
			'R2 storage requires publicUrl in config for public file URLs',
		)
	}

	async initialize(): Promise<void> {
		await this.client.send(
			new ListObjectsV2Command({
				Bucket: this.bucket,
				MaxKeys: 1,
			}),
		)
	}

	async upload(
		file: Buffer | Readable,
		originalFilename: string,
		options?: UploadOptions,
	): Promise<UploadResult> {
		const buffer = Buffer.isBuffer(file) ? file : await streamToBuffer(file)
		const filename = options?.filename || generateFilename(originalFilename)
		const folder = options?.folder || ''
		const key = folder ? `${folder}/${filename}` : filename

		await this.client.send(
			new PutObjectCommand({
				Bucket: this.bucket,
				Key: key,
				Body: buffer,
				ContentType: options?.mimeType || 'application/octet-stream',
			}),
		)

		const url = this.getPublicUrl(key)

		return {
			id: randomUUID(),
			filename,
			originalFilename,
			mimeType: options?.mimeType || 'application/octet-stream',
			size: buffer.length,
			path: key,
			url,
			folder: folder || undefined,
			tags: options?.tags,
			alt: options?.alt,
			customFields: options?.customFields,
			createdAt: new Date(),
			updatedAt: new Date(),
		}
	}

	async uploadChunked(
		stream: Readable,
		originalFilename: string,
		_totalSize: number,
		options?: UploadOptions,
	): Promise<UploadResult> {
		const buffer = await streamToBuffer(stream)
		return this.upload(buffer, originalFilename, options)
	}

	async delete(path: string): Promise<boolean> {
		const key = this.getKey(path)
		try {
			await this.client.send(
				new DeleteObjectsCommand({
					Bucket: this.bucket,
					Delete: { Objects: [{ Key: key }] },
				}),
			)
			return true
		} catch {
			return false
		}
	}

	async deleteMany(
		paths: string[],
	): Promise<{ deleted: number; failed: string[] }> {
		const keys = paths.map((p) => ({ Key: this.getKey(p) }))
		try {
			await this.client.send(
				new DeleteObjectsCommand({
					Bucket: this.bucket,
					Delete: { Objects: keys },
				}),
			)
			return { deleted: paths.length, failed: [] }
		} catch {
			return { deleted: 0, failed: paths }
		}
	}

	getUrl(path: string, _transform?: TransformOptions): string {
		return this.getPublicUrl(this.getKey(path))
	}

	async getStream(path: string): Promise<Readable> {
		const key = this.getKey(path)
		const response = await this.client.send(
			new GetObjectCommand({ Bucket: this.bucket, Key: key }),
		)
		if (!response.Body) {
			throw new Error(`Failed to get object: ${path}`)
		}
		return response.Body as Readable
	}

	async getBuffer(path: string): Promise<Buffer> {
		const stream = await this.getStream(path)
		return streamToBuffer(stream)
	}

	async exists(path: string): Promise<boolean> {
		const key = this.getKey(path)
		try {
			await this.client.send(
				new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
			)
			return true
		} catch {
			return false
		}
	}

	async transform(path: string, _options: TransformOptions): Promise<Buffer> {
		return this.getBuffer(path)
	}

	async move(path: string, newPath: string): Promise<UploadResult> {
		const srcKey = this.getKey(path)
		const destKey = this.getKey(newPath)
		await this.client.send(
			new CopyObjectCommand({
				Bucket: this.bucket,
				CopySource: `${this.bucket}/${srcKey}`,
				Key: destKey,
			}),
		)
		await this.delete(path)
		const filename = newPath.split('/').pop() || newPath
		return {
			id: randomUUID(),
			filename,
			originalFilename: filename,
			mimeType: 'application/octet-stream',
			size: 0,
			path: destKey,
			url: this.getPublicUrl(destKey),
			createdAt: new Date(),
			updatedAt: new Date(),
		}
	}

	async copy(path: string, newPath: string): Promise<UploadResult> {
		const srcKey = this.getKey(path)
		const destKey = this.getKey(newPath)
		await this.client.send(
			new CopyObjectCommand({
				Bucket: this.bucket,
				CopySource: `${this.bucket}/${srcKey}`,
				Key: destKey,
			}),
		)
		const filename = newPath.split('/').pop() || newPath
		return {
			id: randomUUID(),
			filename,
			originalFilename: filename,
			mimeType: 'application/octet-stream',
			size: 0,
			path: destKey,
			url: this.getPublicUrl(destKey),
			createdAt: new Date(),
			updatedAt: new Date(),
		}
	}

	async signedUrl(path: string, expiresIn = 3600): Promise<string> {
		const key = this.getKey(path)
		return getSignedUrl(
			this.client,
			new GetObjectCommand({ Bucket: this.bucket, Key: key }),
			{ expiresIn },
		)
	}
}
