import { StorageConfig } from '@magnet/common'
import { DynamicModule, Module } from '@nestjs/common'
import { DatabaseModule } from '~/modules/database'
import { Media } from './schemas/media.schema'
import { StorageAdapterFactory } from './storage-adapter.factory'
import { STORAGE_ADAPTER, STORAGE_CONFIG } from './storage.constants'
import { StorageController } from './storage.controller'
import { StorageService } from './storage.service'
import { TransformController } from './transform.controller'

@Module({})
export class StorageModule {
	/**
	 * Register the storage module with configuration
	 * @param config - Storage configuration (optional, uses defaults if not provided)
	 */
	static forRoot(config?: StorageConfig): DynamicModule {
		const storageAdapter = StorageAdapterFactory.getAdapter(config)

		return {
			module: StorageModule,
			global: true,
			imports: [DatabaseModule.forFeature(Media)],
			controllers: [StorageController, TransformController],
			providers: [
				{
					provide: STORAGE_CONFIG,
					useValue: config || null,
				},
				{
					provide: STORAGE_ADAPTER,
					useValue: storageAdapter,
				},
				StorageService,
			],
			exports: [StorageService, STORAGE_ADAPTER],
		}
	}
}

// Re-export components for external use
export { Media } from './schemas/media.schema'
export { LocalStorageAdapter } from './adapters/local-storage.adapter'
export { StorageAdapterFactory } from './storage-adapter.factory'
export { StorageService } from './storage.service'
export { STORAGE_ADAPTER, STORAGE_CONFIG } from './storage.constants'
