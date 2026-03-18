import 'reflect-metadata'
import { setDatabaseAdapter } from '@magnet-cms/common'

// Auto-register mongoose adapter on import — ensures @Schema() decorator
// finds the correct adapter even before forRoot() is called.
setDatabaseAdapter('mongoose')

export * from './decorators'
export * from './document'

export * from './mongoose.adapter'
export * from './mongoose.intl'
export * from './mongoose.query-builder'
