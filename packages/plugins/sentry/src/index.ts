// Plugin definition and forRoot()
export { SentryPlugin } from './backend/plugin'
export { initSentryInstrumentation } from './backend/instrumentation'

// Module constants
export { SENTRY_OPTIONS } from './backend/sentry.module'

// Performance monitoring helpers
export { withSentrySpan } from './backend/helpers/span'
export { SentrySpan } from './backend/decorators/sentry-span.decorator'

// Cron monitoring helpers
export {
	SentryCron,
	MagnetSentryCron,
} from './backend/decorators/sentry-cron.decorator'

// Types
export type { SentryClientConfig, SentryPluginConfig } from './backend/types'
