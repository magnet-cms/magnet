import 'reflect-metadata'
import { setDatabaseAdapter } from '@magnet-cms/common'

// Auto-register drizzle adapter on import — ensures @Schema() decorator
// finds the correct adapter even before forRoot() is called.
setDatabaseAdapter('drizzle')

export * from './decorators'
export * from './schema'
export * from './dialects'
export * from './drizzle.adapter'
export * from './drizzle.query-builder'
export * from './types'
export * from './migrations'
