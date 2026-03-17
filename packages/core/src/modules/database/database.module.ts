import {
	type DBConfig,
	DatabaseAdapter,
	getModelToken,
	getSchemaToken,
	registerModel,
} from '@magnet-cms/common'
import { DynamicModule, Module, Scope, Type } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { InternationalizationModule } from './modules/internationalization/internationalization.module'

const modules = [InternationalizationModule]

@Module({
	imports: modules,
	exports: modules,
})
export class DatabaseModule {
	/** Cached adapter instance set during register(), used by forFeature() */
	private static adapter: DatabaseAdapter | null = null

	/**
	 * Register the database module with an adapter and config.
	 *
	 * @param adapter - The database adapter instance (from provider.adapter)
	 * @param config - Resolved database config (from provider.config)
	 */
	static register(adapter: DatabaseAdapter, config: DBConfig): DynamicModule {
		DatabaseModule.adapter = adapter
		const adapterOptions = adapter.connect(config)

		return {
			module: DatabaseModule,
			imports: [...(adapterOptions.imports || []), ...modules],
			providers: [...(adapterOptions.providers || [])],
			exports: [...(adapterOptions.exports || []), ...modules],
		}
	}

	static forFeature(schemas: Type | Type[]): DynamicModule {
		const adapter = DatabaseModule.adapter
		if (!adapter) {
			throw new Error(
				'DatabaseModule.register() must be called before DatabaseModule.forFeature(). ' +
					'Ensure MagnetModule.forRoot() includes a database provider.',
			)
		}
		const schemasArray = Array.isArray(schemas) ? schemas : [schemas]

		const schemasProviders = schemasArray.map((schema) => ({
			imports: [adapter.forFeature(schema)],
			providers: [
				{
					provide: getModelToken(schema),
					useFactory: async (moduleRef: ModuleRef) => {
						// Pass a factory function to createModel instead of the model directly
						// This allows lazy loading of the Mongoose model
						const modelFactory = async () => {
							return await moduleRef.get(adapter.token(schema.name), {
								strict: false,
							})
						}
						const instance = new (adapter.model(modelFactory))()
						registerModel(getModelToken(schema), instance)
						return instance
					},
					inject: [ModuleRef],
					scope: Scope.DEFAULT,
				},
				{
					provide: getSchemaToken(schema),
					useClass: schema,
				},
			],
		}))

		const imports = schemasProviders.flatMap((mp) => mp.imports)
		const providers = schemasProviders.flatMap((mp) => mp.providers)

		return {
			module: DatabaseModule,
			imports,
			providers,
			exports: [...providers],
		}
	}
}
