import { DynamicModule, Module } from '@nestjs/common'
import { OpenAPIService } from './openapi.service'
import { OPENAPI_CONFIG } from './openapi.types'
import type { OpenAPIConfig } from './openapi.types'

@Module({})
export class OpenAPIModule {
	/**
	 * Register the OpenAPI module with the given configuration.
	 *
	 * @example
	 * ```typescript
	 * OpenAPIModule.forRoot({ title: 'My API', version: '2.0.0' })
	 * ```
	 */
	static forRoot(config: OpenAPIConfig = {}): DynamicModule {
		return {
			module: OpenAPIModule,
			global: false,
			providers: [
				{
					provide: OPENAPI_CONFIG,
					useValue: config,
				},
				OpenAPIService,
			],
			exports: [OpenAPIService],
		}
	}
}
