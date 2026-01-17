import {
	DatabaseAdapter,
	MagnetModuleOptions,
	getModelToken,
	getSchemaToken,
} from '@magnet-cms/common'
import { DynamicModule, Module, Scope, Type } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { DatabaseAdapterFactory } from './database-adapter.factory'
import { InternationalizationModule } from './modules/internationalization/internationalization.module'

const modules = [InternationalizationModule]

@Module({
	imports: modules,
	exports: modules,
})
export class DatabaseModule {
	static register(options: MagnetModuleOptions): DynamicModule {
		const adapter: DatabaseAdapter = DatabaseAdapterFactory.getAdapter(
			options.db,
		)
		const adapterOptions = adapter.connect(options)

		return {
			module: DatabaseModule,
			imports: [...(adapterOptions.imports || []), ...modules],
			providers: [...(adapterOptions.providers || [])],
			exports: [...(adapterOptions.exports || []), ...modules],
		}
	}

	static forFeature(schemas: Type | Type[]): DynamicModule {
		const adapter: DatabaseAdapter = DatabaseAdapterFactory.getAdapter()
		const schemasArray = Array.isArray(schemas) ? schemas : [schemas]

		const schemasProviders = schemasArray.map((schema) => ({
			imports: [adapter.forFeature(schema)],
			providers: [
				{
					provide: getModelToken(schema),
					useFactory: async (moduleRef: ModuleRef) => {
						await new Promise((resolve) => setTimeout(resolve, 500))

						const modelInstance = await moduleRef.get(
							adapter.token(schema.name),
							{
								strict: false,
							},
						)
						return new (adapter.model(modelInstance))()
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
