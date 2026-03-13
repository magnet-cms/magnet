import { Global, Module } from '@nestjs/common'
import { MagnetLogger } from './logger.service'
import { LoggingInterceptor } from './logging.interceptor'

/**
 * Logging Module
 *
 * Provides MagnetLogger globally across all modules.
 *
 * This module is global, so MagnetLogger is available in all modules without
 * needing to import LoggingModule. Because MagnetLogger uses Scope.TRANSIENT,
 * each injection gets its own instance (allowing per-service context strings).
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(private readonly logger: MagnetLogger) {
 *     this.logger.setContext(MyService.name)
 *   }
 *
 *   doWork() {
 *     this.logger.log('Starting work', { operation: 'doWork' })
 *   }
 * }
 * ```
 */
@Global()
@Module({
	providers: [MagnetLogger, LoggingInterceptor],
	exports: [MagnetLogger, LoggingInterceptor],
})
export class LoggingModule {}
