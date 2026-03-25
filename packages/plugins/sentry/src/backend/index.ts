// Plugin definition and forRoot()
export { SentryPlugin } from './plugin'
export { SentryModule } from './sentry.module'

// Module constants
export { SENTRY_OPTIONS } from './constants'

// Lifecycle helpers
export { initSentryInstrumentation } from './instrumentation'

// Performance monitoring helpers
export { withSentrySpan } from './helpers/span'
export { SentrySpan } from './decorators/sentry-span.decorator'

// Cron monitoring helpers
export { SentryCron, MagnetSentryCron } from './decorators/sentry-cron.decorator'

// Types
export type { SentryClientConfig, SentryPluginConfig } from './types'
