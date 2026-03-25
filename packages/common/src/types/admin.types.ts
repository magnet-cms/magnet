import { SchemaMetadata } from './schema-metadata.types'

export type InitialConfig = {
  title?: string
  description?: string
  env: string
  schemas: SchemaMetadata[]
  settings: SchemaMetadata[]
}
