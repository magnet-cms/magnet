import {
	type AdapterCapabilities,
	type AdapterFeature,
	type AdapterName,
	BaseSchema,
	DatabaseAdapter,
	MagnetModuleOptions,
	MongooseConfig,
	getSchemaOptions,
} from '@magnet-cms/common'
import { DynamicModule, Injectable, Type } from '@nestjs/common'
import { MongooseModule, SchemaFactory } from '@nestjs/mongoose'
import mongoose, { Document, Model as MongooseModel, Schema } from 'mongoose'

import { DocumentPluginService } from './document/document.plugin'
import { createModel } from './mongoose.model'

@Injectable()
class MongooseAdapter extends DatabaseAdapter {
	readonly name: AdapterName = 'mongoose'
	private options: MagnetModuleOptions | null = null
	private readonly documentPlugin: DocumentPluginService

	constructor() {
		super()
		this.documentPlugin = new DocumentPluginService()
	}

	connect(options: MagnetModuleOptions): DynamicModule {
		this.options = options

		if (mongoose.connection.readyState === 1) {
			return {
				module: MongooseModule,
				imports: [],
				providers: [],
				exports: [],
			}
		}

		return MongooseModule.forRootAsync({
			useFactory: () => ({
				uri: (options.db as MongooseConfig).uri,
			}),
		})
	}

	forFeature(schemas: Type | Type[]): DynamicModule {
		const schemaArray = Array.isArray(schemas) ? schemas : [schemas]

		const schemasFactory = schemaArray.map((schemaClass) => {
			const mongooseSchema = SchemaFactory.createForClass(schemaClass)

			// Apply document plugin based on schema options and intl properties
			this.applyDocumentPlugin(mongooseSchema, schemaClass)

			return {
				name: schemaClass.name,
				schema: mongooseSchema,
			}
		})

		return MongooseModule.forFeature(schemasFactory)
	}

	model<T>(modelInstance: unknown): ReturnType<typeof createModel<T>> {
		return createModel<T>(
			modelInstance as MongooseModel<Document & BaseSchema<T>>,
		)
	}

	token(schema: string): string {
		// Use NestJS Mongoose's token pattern: `${name}Model`
		// This matches what MongooseModule.forFeature() uses internally
		return `${schema}Model`
	}

	/**
	 * Cleanup on module destroy - close MongoDB connection
	 */
	async onModuleDestroy(): Promise<void> {
		if (mongoose.connection.readyState === 1) {
			await mongoose.connection.close()
		}
	}

	/**
	 * Check if adapter supports a feature
	 */
	supports(feature: AdapterFeature): boolean {
		const supportedFeatures: AdapterFeature[] = [
			'transactions',
			'json-queries',
			'full-text-search',
			'geospatial',
			'change-streams',
		]
		return supportedFeatures.includes(feature)
	}

	/**
	 * Get adapter capabilities
	 */
	getCapabilities(): AdapterCapabilities {
		return {
			databases: ['mongodb'],
			features: [
				'transactions',
				'json-queries',
				'full-text-search',
				'geospatial',
				'change-streams',
			],
			handlesVersioning: false,
			supportsLazyCreation: true,
		}
	}

	/**
	 * Apply document plugin to a schema based on schema options
	 * This adds documentId, locale, and status fields for the document-based i18n/versioning system
	 * @param schema The Mongoose schema to apply the plugin to
	 * @param schemaClass The schema class to read options from
	 */
	private applyDocumentPlugin(schema: Schema, schemaClass: Type) {
		const options = getSchemaOptions(schemaClass)

		// Skip document plugin entirely if both i18n and versioning are disabled
		if (options.i18n === false && options.versioning === false) {
			return
		}

		// Check if i18n is enabled at the schema level (default is true if not explicitly disabled)
		// OR if the schema has any properties with intl: true
		let hasIntl = options.i18n !== false

		// Also check for property-level intl settings
		if (!hasIntl) {
			schema.eachPath((path, schemaType) => {
				if (schemaType.options?.intl) {
					hasIntl = true
				}
			})
		}

		// Apply document plugin for i18n/versioning support
		this.documentPlugin.applyDocumentPlugin(schema, { hasIntl })
	}
}

export const Adapter = new MongooseAdapter()
