import type { CacheAdapter } from '@magnet-cms/common'
import { type DynamicModule, Logger, Module } from '@nestjs/common'

import { MemoryCacheAdapter } from './adapters/memory-cache.adapter'
import { CACHE_ADAPTER_TOKEN } from './cache.constants'
import { CacheService } from './cache.service'
import { CacheSettings } from './cache.settings'

import { SettingsModule } from '~/modules/settings'

const logger = new Logger('CacheModule')

@Module({})
export class CacheModule {
  /**
   * Configure the cache module with an adapter instance.
   *
   * When no adapter is provided (null), the built-in MemoryCacheAdapter
   * is used as a zero-config default — no Redis or external service required.
   *
   * @param adapter - Cache adapter instance (e.g., RedisCacheAdapter), or null for memory default
   *
   * @example
   * ```typescript
   * // Zero-config: uses built-in in-memory cache
   * MagnetModule.forRoot([
   *   MongooseDatabaseAdapter.forRoot(),
   * ])
   *
   * // Redis/Dragonfly cache:
   * MagnetModule.forRoot([
   *   MongooseDatabaseAdapter.forRoot(),
   *   RedisCacheAdapter.forRoot(),
   * ])
   * ```
   */
  static forRoot(adapter?: CacheAdapter | null): DynamicModule {
    const resolvedAdapter = adapter ?? new MemoryCacheAdapter()

    if (adapter) {
      logger.log(`Cache module initialized with '${adapter.name}' adapter`)
    } else {
      logger.log('Cache module initialized with built-in memory adapter')
    }

    return {
      module: CacheModule,
      global: true,
      imports: [SettingsModule.forFeature(CacheSettings)],
      providers: [
        {
          provide: CACHE_ADAPTER_TOKEN,
          useValue: resolvedAdapter,
        },
        CacheService,
      ],
      exports: [CacheService, CACHE_ADAPTER_TOKEN],
    }
  }
}
