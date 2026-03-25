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
  type EnvVarRequirement,
  type S3StorageConfig,
  StorageAdapter,
  type StorageMagnetProvider,
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
 * S3 Storage adapter for Magnet CMS.
 * Uses AWS S3 or S3-compatible services for file storage.
 *
 * @example
 * ```typescript
 * import { S3StorageAdapter } from '@magnet-cms/adapter-storage-s3'
 *
 * const storage = new S3StorageAdapter({
 *   bucket: 'my-bucket',
 *   region: 'us-east-1',
 *   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
 *   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
 * })
 * ```
 */
export class S3StorageAdapter extends StorageAdapter {
  private readonly client: S3Client
  private readonly config: S3StorageConfig
  private readonly bucket: string

  constructor(config: S3StorageConfig) {
    super()
    this.config = config
    this.bucket = config.bucket

    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      ...(config.endpoint && { endpoint: config.endpoint }),
      ...(config.forcePathStyle !== undefined && {
        forcePathStyle: config.forcePathStyle,
      }),
    })
  }

  private getKey(path: string): string {
    return path
  }

  private getPublicUrl(key: string): string {
    if (this.config.publicUrl) {
      return `${this.config.publicUrl.replace(/\/$/, '')}/${key}`
    }
    // Default S3 URL format
    const endpoint = this.config.endpoint || `https://s3.${this.config.region}.amazonaws.com`
    return `${endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`
  }

  async initialize(): Promise<void> {
    // Verify bucket access by listing (max 1 object)
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

  async deleteMany(paths: string[]): Promise<{ deleted: number; failed: string[] }> {
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
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
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
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      return true
    } catch {
      return false
    }
  }

  async transform(path: string, _options: TransformOptions): Promise<Buffer> {
    // S3 has no built-in image transform; return original
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
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn,
    })
  }

  /** Environment variables used by this adapter */
  static readonly envVars: EnvVarRequirement[] = [
    { name: 'S3_BUCKET', required: true, description: 'S3 bucket name' },
    { name: 'S3_REGION', required: false, description: 'AWS region' },
    {
      name: 'S3_ACCESS_KEY_ID',
      required: true,
      description: 'AWS access key ID',
    },
    {
      name: 'S3_SECRET_ACCESS_KEY',
      required: true,
      description: 'AWS secret access key',
    },
    {
      name: 'S3_ENDPOINT',
      required: false,
      description: 'Custom S3 endpoint URL',
    },
  ]

  /**
   * Create a configured storage provider for MagnetModule.forRoot().
   * Auto-resolves config values from environment variables if not provided.
   */
  static forRoot(config?: Partial<S3StorageConfig>): StorageMagnetProvider {
    const resolvedConfig: S3StorageConfig = {
      bucket: config?.bucket ?? process.env.S3_BUCKET ?? '',
      region: config?.region ?? process.env.S3_REGION ?? 'us-east-1',
      accessKeyId: config?.accessKeyId ?? process.env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: config?.secretAccessKey ?? process.env.S3_SECRET_ACCESS_KEY ?? '',
      endpoint: config?.endpoint ?? process.env.S3_ENDPOINT,
      publicUrl: config?.publicUrl ?? process.env.S3_PUBLIC_URL,
      forcePathStyle: config?.forcePathStyle,
    }

    return {
      type: 'storage',
      adapter: new S3StorageAdapter(resolvedConfig),
      config: resolvedConfig as unknown as Record<string, unknown>,
      envVars: S3StorageAdapter.envVars,
    }
  }
}
