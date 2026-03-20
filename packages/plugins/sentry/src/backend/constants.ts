/**
 * Injection token for Sentry plugin options.
 * Extracted to a separate file to avoid circular imports between
 * sentry.module.ts and sentry-config.controller.ts.
 */
export const SENTRY_OPTIONS = 'SENTRY_OPTIONS'
