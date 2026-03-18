import type { StorageAdapter } from '@magnet-cms/common'
import { DatabaseModule } from '@magnet-cms/core'
import { DynamicModule, Module } from '@nestjs/common'
import { SettingsModule } from '~/modules/settings'
import { LocalStorageAdapter } from './adapters/local-storage.adapter'
import { MediaFolder } from './schemas/media-folder.schema'
import { Media } from './schemas/media.schema'
import { STORAGE_ADAPTER, STORAGE_CONFIG } from './storage.constants'
import { StorageController } from './storage.controller'
import { StorageService } from './storage.service'
import { MediaSettings } from './storage.settings'
import { TransformController } from './transform.controller'

@Module({})
export class StorageModule {
	/**
	 * Register the storage module with an adapter instance.
	 *
	 * @param adapter - Storage adapter instance (from provider), or null for default local storage
	 * @param config - Optional adapter-specific config for DI consumers
	 */
	static forRoot(
		adapter?: StorageAdapter | null,
		config?: Record<string, unknown> | null,
	): DynamicModule {
		const storageAdapter =
			adapter ??
			new LocalStorageAdapter({
				uploadDir: './uploads',
				publicPath: '/media',
			})

		return {
			module: StorageModule,
			global: true,
			imports: [
				DatabaseModule.forFeature(Media),
				DatabaseModule.forFeature(MediaFolder),
				SettingsModule.forFeature(MediaSettings),
			],
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
export { MediaFolder } from './schemas/media-folder.schema'
export { Media } from './schemas/media.schema'
export { LocalStorageAdapter } from './adapters/local-storage.adapter'
export { StorageService } from './storage.service'
export { STORAGE_ADAPTER, STORAGE_CONFIG } from './storage.constants'
