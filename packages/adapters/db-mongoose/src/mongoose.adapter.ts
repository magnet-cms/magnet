import {
  type AdapterCapabilities,
  type AdapterFeature,
  type AdapterName,
  BaseSchema,
  type DBConfig,
  DatabaseAdapter,
  type DatabaseMagnetProvider,
  type EnvVarRequirement,
  MongooseConfig,
  getSchemaOptions,
  setDatabaseAdapter,
} from '@magnet-cms/common'
import { DynamicModule, Injectable, Type } from '@nestjs/common'
import { MongooseModule, SchemaFactory } from '@nestjs/mongoose'
import mongoose, { Document, Model as MongooseModel, Schema } from 'mongoose'

import { DocumentPluginService } from './document/document.plugin'
import { createModel } from './mongoose.model'

/** Singleton adapter instance */
let adapterInstance: MongooseDatabaseAdapter | null = null

/**
 * Mongoose database adapter for Magnet CMS.
 * Provides MongoDB connectivity via Mongoose ODM.
 *
 * @example
 * ```typescript
 * MagnetModule.forRoot([
 *   MongooseDatabaseAdapter.forRoot(),
 *   // or with explicit config:
 *   MongooseDatabaseAdapter.forRoot({ uri: 'mongodb://localhost:27017/mydb' }),
 * ])
 * ```
 */
@Injectable()
export class MongooseDatabaseAdapter extends DatabaseAdapter {
  readonly name: AdapterName = 'mongoose'
  private readonly documentPlugin: DocumentPluginService

  constructor() {
    super()
    this.documentPlugin = new DocumentPluginService()
  }

  connect(config: DBConfig): DynamicModule {
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
        uri: (config as MongooseConfig).uri,
      }),
    })
  }

  forFeature(schemas: Type | Type[]): DynamicModule {
    const schemaArray = Array.isArray(schemas) ? schemas : [schemas]

    const schemasFactory = schemaArray.map((schemaClass) => {
      const mongooseSchema = SchemaFactory.createForClass(schemaClass)

      // Apply document plugin based on schema options and intl properties
      this.applyDocumentPlugin(mongooseSchema, schemaClass)

      // Apply custom indexes from schema options
      this.applySchemaIndexes(mongooseSchema, schemaClass)

      return {
        name: schemaClass.name,
        schema: mongooseSchema,
      }
    })

    return MongooseModule.forFeature(schemasFactory)
  }

  model<T>(modelInstance: unknown): ReturnType<typeof createModel<T>> {
    return createModel<T>(modelInstance as MongooseModel<Document & BaseSchema<T>>)
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
  private applySchemaIndexes(schema: Schema, schemaClass: Type) {
    const options = getSchemaOptions(schemaClass)
    const indexes = (
      options as {
        indexes?: { keys: Record<string, 1 | -1>; unique?: boolean }[]
      }
    ).indexes
    if (indexes?.length) {
      for (const idx of indexes) {
        schema.index(idx.keys as { [key: string]: 1 | -1 }, {
          unique: idx.unique,
        })
      }
    }
  }

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

  /** Environment variables required by this adapter */
  static readonly envVars: EnvVarRequirement[] = [
    {
      name: 'MONGODB_URI',
      required: true,
      description: 'MongoDB connection URI',
    },
  ]

  /**
   * Create a configured database provider for MagnetModule.forRoot().
   * Auto-resolves the connection URI from MONGODB_URI env var if not provided.
   *
   * @param config - Optional Mongoose configuration. If omitted, reads from MONGODB_URI env var.
   * @returns A DatabaseMagnetProvider to pass to MagnetModule.forRoot()
   */
  static forRoot(config?: Partial<MongooseConfig>): DatabaseMagnetProvider {
    setDatabaseAdapter('mongoose')

    const resolvedConfig: MongooseConfig = {
      uri: config?.uri ?? process.env.MONGODB_URI ?? '',
    }

    if (!adapterInstance) {
      adapterInstance = new MongooseDatabaseAdapter()
    }

    return {
      type: 'database',
      adapter: adapterInstance,
      config: resolvedConfig,
      envVars: MongooseDatabaseAdapter.envVars,
    }
  }

  /**
   * Get the singleton adapter instance.
   * @internal Used by DatabaseModule for forFeature() calls.
   */
  static getInstance(): MongooseDatabaseAdapter {
    if (!adapterInstance) {
      adapterInstance = new MongooseDatabaseAdapter()
    }
    return adapterInstance
  }
}

/**
 * @deprecated Use MongooseDatabaseAdapter instead.
 * Kept temporarily for internal compatibility during migration.
 */
export const Adapter = MongooseDatabaseAdapter.getInstance()
