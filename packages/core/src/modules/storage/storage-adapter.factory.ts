import type { StorageAdapter, StorageConfig } from '@magnet-cms/common'
import { LocalStorageAdapter } from './adapters/local-storage.adapter'

/**
 * Factory for creating storage adapters based on configuration.
 * The local adapter is built-in, while S3/R2 adapters are loaded dynamically
 * from separate packages.
 */
export class StorageAdapterFactory {
	private static cachedAdapter: StorageAdapter | null = null
	private static cachedConfig: StorageConfig | null = null

	/**
	 * Get or create a storage adapter based on configuration.
	 * @param config - Storage configuration (optional, will use defaults if not provided)
	 */
	static getAdapter(config?: StorageConfig): StorageAdapter {
		// Return cached adapter if config hasn't changed
		if (
			StorageAdapterFactory.cachedAdapter &&
			StorageAdapterFactory.configMatches(config)
		) {
			return StorageAdapterFactory.cachedAdapter
		}

		const adapterType =
			config?.adapter || StorageAdapterFactory.detectStorageAdapter()

		switch (adapterType) {
			case 'local':
				StorageAdapterFactory.cachedAdapter = new LocalStorageAdapter(
					config?.local || {
						uploadDir: './uploads',
						publicPath: '/media',
					},
				)
				break

			case 's3':
				if (!config?.s3) {
					throw new Error('S3 configuration is required for S3 adapter')
				}
				try {
					const { S3StorageAdapter } = require('@magnet-cms/adapter-storage-s3')
					StorageAdapterFactory.cachedAdapter = new S3StorageAdapter(config.s3)
				} catch {
					throw new Error(
						'S3 storage adapter not found. Please install @magnet-cms/adapter-storage-s3',
					)
				}
				break

			case 'r2':
				if (!config?.r2) {
					throw new Error('R2 configuration is required for R2 adapter')
				}
				try {
					const { R2StorageAdapter } = require('@magnet-cms/adapter-storage-s3')
					StorageAdapterFactory.cachedAdapter = new R2StorageAdapter(config.r2)
				} catch {
					throw new Error(
						'R2 storage adapter not found. Please install @magnet-cms/adapter-storage-s3',
					)
				}
				break

			default:
				// Default to local storage
				StorageAdapterFactory.cachedAdapter = new LocalStorageAdapter({
					uploadDir: './uploads',
					publicPath: '/media',
				})
		}

		StorageAdapterFactory.cachedConfig = config || null

		if (!StorageAdapterFactory.cachedAdapter) {
			throw new Error('Failed to initialize storage adapter')
		}

		return StorageAdapterFactory.cachedAdapter
	}

	/**
	 * Clear the cached adapter (useful for testing)
	 */
	static clearCache(): void {
		StorageAdapterFactory.cachedAdapter = null
		StorageAdapterFactory.cachedConfig = null
	}

	/**
	 * Detect the storage adapter to use based on environment variables
	 */
	private static detectStorageAdapter(): 'local' | 's3' | 'r2' {
		// Check for S3 environment variables
		if (
			process.env.S3_BUCKET ||
			process.env.AWS_S3_BUCKET ||
			process.env.STORAGE_S3_BUCKET
		) {
			return 's3'
		}

		// Check for R2 environment variables
		if (
			process.env.R2_BUCKET ||
			process.env.CLOUDFLARE_R2_BUCKET ||
			process.env.STORAGE_R2_BUCKET
		) {
			return 'r2'
		}

		// Default to local storage
		return 'local'
	}

	/**
	 * Check if the provided config matches the cached config
	 */
	private static configMatches(config?: StorageConfig): boolean {
		if (!config && !StorageAdapterFactory.cachedConfig) {
			return true
		}
		if (!config || !StorageAdapterFactory.cachedConfig) {
			return false
		}
		// Simple reference check - for more complex cases, use deep equality
		return config === StorageAdapterFactory.cachedConfig
	}
}
