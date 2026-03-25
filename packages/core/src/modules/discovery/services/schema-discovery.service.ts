import { SCHEMA_METADATA_KEY, SETTING_METADATA_KEY, SchemaMetadata } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { ModulesContainer } from '@nestjs/core'

import { MetadataExtractorService } from './metadata-extractor.service'

@Injectable()
export class SchemaDiscoveryService {
  constructor(
    private readonly modulesContainer: ModulesContainer,
    private readonly metadataExtractor: MetadataExtractorService,
  ) {}

  discoverSchemas(): { schemas: SchemaMetadata[]; settings: SchemaMetadata[] } {
    const allSchemas = [...this.modulesContainer.values()]
      .flatMap((module) => [...module.providers.values()])
      .filter((wrapper) => wrapper.metatype && typeof wrapper.metatype === 'function')

    // Deduplicate schemas by className (original class name)
    const schemasMap = new Map<string, SchemaMetadata>()

    allSchemas
      .filter(
        (wrapper) =>
          wrapper.metatype &&
          Reflect.getMetadata(SCHEMA_METADATA_KEY, wrapper.metatype) !== undefined,
      )
      .forEach((wrapper) => {
        const schema = this.metadataExtractor.extractSchemaMetadata(wrapper)
        if (schema?.className) {
          // Use className as the key to deduplicate
          // If a schema with the same className already exists, keep the first one
          if (!schemasMap.has(schema.className)) {
            schemasMap.set(schema.className, schema)
          }
        }
      })

    const schemas = Array.from(schemasMap.values())

    // Deduplicate settings schemas by className
    const settingsMap = new Map<string, SchemaMetadata>()

    allSchemas
      .filter(
        (wrapper) =>
          wrapper.metatype &&
          Reflect.getMetadata(SETTING_METADATA_KEY, wrapper.metatype) !== undefined,
      )
      .forEach((wrapper) => {
        const schema = this.metadataExtractor.extractSchemaMetadata(wrapper)
        if (schema?.className) {
          if (!settingsMap.has(schema.className)) {
            settingsMap.set(schema.className, schema)
          }
        }
      })

    const settingsSchemas = Array.from(settingsMap.values())

    return { schemas, settings: settingsSchemas }
  }
}
