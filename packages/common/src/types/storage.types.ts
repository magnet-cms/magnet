import type { Readable } from 'node:stream'

// ============================================================================
// Storage Configuration Types
// ============================================================================

export interface LocalStorageConfig {
	/** Directory where files will be stored (e.g., './uploads') */
	uploadDir: string
	/** Public URL path for serving files (e.g., '/media') */
	publicPath: string
	/** Maximum file size in bytes (default: 50MB) */
	maxFileSize?: number
	/** Allowed MIME types (default: all) */
	allowedMimeTypes?: string[]
}

export interface S3StorageConfig {
	/** S3 bucket name */
	bucket: string
	/** AWS region */
	region: string
	/** AWS access key ID */
	accessKeyId: string
	/** AWS secret access key */
	secretAccessKey: string
	/** Custom endpoint URL (for R2, MinIO, etc.) */
	endpoint?: string
	/** Public URL for serving files (CDN URL) */
	publicUrl?: string
	/** Enable path-style access (required for some S3-compatible services) */
	forcePathStyle?: boolean
}

export interface R2StorageConfig extends S3StorageConfig {
	/** Cloudflare account ID */
	accountId: string
}

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

export interface StorageConfig {
	/** Storage adapter to use */
	adapter: 'local' | 's3' | 'r2' | 'supabase'
	/** Local storage configuration */
	local?: LocalStorageConfig
	/** S3 storage configuration */
	s3?: S3StorageConfig
	/** R2 storage configuration */
	r2?: R2StorageConfig
	/** Supabase storage configuration */
	supabase?: SupabaseStorageConfig
}

// ============================================================================
// Upload Types
// ============================================================================

export interface UploadOptions {
	/** Target folder for the file */
	folder?: string
	/** Custom filename (auto-generated if not provided) */
	filename?: string
	/** MIME type of the file */
	mimeType?: string
	/** Tags for categorization */
	tags?: string[]
	/** Alt text for accessibility */
	alt?: string
	/** Custom metadata fields */
	customFields?: Record<string, unknown>
}

export interface UploadResult {
	/** Unique identifier for the uploaded file */
	id: string
	/** Stored filename */
	filename: string
	/** Original filename from user */
	originalFilename: string
	/** MIME type of the file */
	mimeType: string
	/** File size in bytes */
	size: number
	/** Storage path or key */
	path: string
	/** Public URL to access the file */
	url: string
	/** Folder the file is stored in */
	folder?: string
	/** Tags associated with the file */
	tags?: string[]
	/** Alt text for accessibility */
	alt?: string
	/** Image width in pixels (for images only) */
	width?: number
	/** Image height in pixels (for images only) */
	height?: number
	/** Custom metadata fields */
	customFields?: Record<string, unknown>
	/** Upload timestamp */
	createdAt: Date
	/** Last update timestamp */
	updatedAt: Date
}

// ============================================================================
// Transform Types
// ============================================================================

export interface TransformOptions {
	/** Target width in pixels */
	width?: number
	/** Target height in pixels */
	height?: number
	/** Resize fit mode */
	fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
	/** Output format */
	format?: 'jpeg' | 'png' | 'webp' | 'avif'
	/** Quality (1-100) */
	quality?: number
}

// ============================================================================
// Query Types
// ============================================================================

export interface MediaQueryOptions {
	/** Filter by folder */
	folder?: string
	/** Filter by MIME type (supports partial match) */
	mimeType?: string
	/** Filter by tags (any match) */
	tags?: string[]
	/** Search in filename and alt text */
	search?: string
	/** Page number (1-indexed) */
	page?: number
	/** Items per page */
	limit?: number
	/** Sort field */
	sortBy?: 'createdAt' | 'filename' | 'size'
	/** Sort direction */
	sortOrder?: 'asc' | 'desc'
}

export interface PaginatedMedia<T = UploadResult> {
	/** List of items */
	items: T[]
	/** Total number of items */
	total: number
	/** Current page */
	page: number
	/** Items per page */
	limit: number
	/** Total number of pages */
	totalPages: number
}

// ============================================================================
// Storage Adapter Abstract Class
// ============================================================================

export abstract class StorageAdapter {
	/**
	 * Initialize the storage adapter (create directories, check connections)
	 */
	abstract initialize(): Promise<void>

	/**
	 * Upload a file to storage
	 * @param file - File buffer or readable stream
	 * @param originalFilename - Original filename from user
	 * @param options - Upload options
	 */
	abstract upload(
		file: Buffer | Readable,
		originalFilename: string,
		options?: UploadOptions,
	): Promise<UploadResult>

	/**
	 * Upload a file using chunked/streaming upload (for large files)
	 * @param stream - Readable stream of the file
	 * @param originalFilename - Original filename from user
	 * @param totalSize - Total size of the file in bytes
	 * @param options - Upload options
	 */
	abstract uploadChunked(
		stream: Readable,
		originalFilename: string,
		totalSize: number,
		options?: UploadOptions,
	): Promise<UploadResult>

	/**
	 * Delete a file from storage
	 * @param path - Storage path or key of the file
	 */
	abstract delete(path: string): Promise<boolean>

	/**
	 * Delete multiple files from storage
	 * @param paths - Array of storage paths or keys
	 */
	abstract deleteMany(
		paths: string[],
	): Promise<{ deleted: number; failed: string[] }>

	/**
	 * Get the public URL for a file
	 * @param path - Storage path or key
	 * @param transform - Optional transform options for images
	 */
	abstract getUrl(path: string, transform?: TransformOptions): string

	/**
	 * Get a readable stream for a file
	 * @param path - Storage path or key
	 */
	abstract getStream(path: string): Promise<Readable>

	/**
	 * Get the file as a buffer
	 * @param path - Storage path or key
	 */
	abstract getBuffer(path: string): Promise<Buffer>

	/**
	 * Check if a file exists
	 * @param path - Storage path or key
	 */
	abstract exists(path: string): Promise<boolean>

	/**
	 * Get a transformed version of an image
	 * @param path - Storage path or key
	 * @param options - Transform options
	 */
	abstract transform(path: string, options: TransformOptions): Promise<Buffer>

	/**
	 * Move/rename a file
	 * @param path - Current storage path or key
	 * @param newPath - New storage path or key
	 */
	move?(path: string, newPath: string): Promise<UploadResult>

	/**
	 * Copy a file
	 * @param path - Source storage path or key
	 * @param newPath - Destination storage path or key
	 */
	copy?(path: string, newPath: string): Promise<UploadResult>

	/**
	 * Generate a signed URL for temporary access (for S3/R2)
	 * @param path - Storage path or key
	 * @param expiresIn - Expiration time in seconds
	 */
	signedUrl?(path: string, expiresIn?: number): Promise<string>
}
