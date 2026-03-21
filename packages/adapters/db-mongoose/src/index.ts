import 'reflect-metadata'
import {
	registerDatabaseAdapterSingletonForFeature,
	setDatabaseAdapter,
} from '@magnet-cms/common'
import { MongooseDatabaseAdapter } from './mongoose.adapter'

// Auto-register mongoose adapter on import — ensures @Schema() decorator
// finds the correct adapter even before forRoot() is called.
setDatabaseAdapter('mongoose')
registerDatabaseAdapterSingletonForFeature(() =>
	MongooseDatabaseAdapter.getInstance(),
)

export * from './decorators'
export * from './document'

export * from './mongoose.adapter'
export * from './mongoose.intl'
export * from './mongoose.query-builder'
