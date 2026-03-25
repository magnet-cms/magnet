import 'reflect-metadata'
import { registerDatabaseAdapterSingletonForFeature, setDatabaseAdapter } from '@magnet-cms/common'

import { DrizzleDatabaseAdapter } from './drizzle.adapter'

// Auto-register drizzle adapter on import — ensures @Schema() decorator
// finds the correct adapter even before forRoot() is called.
setDatabaseAdapter('drizzle')
registerDatabaseAdapterSingletonForFeature(() => DrizzleDatabaseAdapter.getInstance())

export * from './decorators'
export * from './schema'
export * from './dialects'
export * from './drizzle.adapter'
export * from './drizzle.query-builder'
export * from './types'
export * from './migrations'
