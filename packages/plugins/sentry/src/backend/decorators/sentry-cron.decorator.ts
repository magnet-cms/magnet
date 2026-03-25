/**
 * Re-export SentryCron from @sentry/nestjs for convenience.
 *
 * Use @SentryCron to monitor cron jobs in Sentry. Apply it AFTER @Cron()
 * from @nestjs/schedule.
 *
 * @example
 * ```typescript
 * import { Cron, CronExpression } from '@nestjs/schedule'
 * import { SentryCron } from '@magnet-cms/plugin-sentry'
 *
 * @Injectable()
 * export class TasksService {
 *   @Cron(CronExpression.EVERY_HOUR)
 *   @SentryCron('hourly-cleanup', {
 *     schedule: { type: 'crontab', value: '0 * * * *' },
 *     checkinMargin: 5,
 *     maxRuntime: 30,
 *   })
 *   handleCleanup() {
 *     // Sentry monitors this job and alerts if it misses or takes too long
 *   }
 * }
 * ```
 */
export { SentryCron } from '@sentry/nestjs'

/**
 * Magnet-flavored Sentry cron decorator with automatic slug generation.
 *
 * Wraps @SentryCron and auto-generates a monitor slug from the class and
 * method name when no explicit slug is provided.
 *
 * @param slug - Monitor slug in Sentry (default: auto-generated from method name)
 * @param options - Additional Sentry monitor options
 *
 * @example
 * ```typescript
 * @Cron(CronExpression.EVERY_MINUTE)
 * @MagnetSentryCron()
 * handleMinuteTask() {
 *   // Slug auto-generated as "TasksService-handleMinuteTask"
 * }
 *
 * @Cron(CronExpression.EVERY_HOUR)
 * @MagnetSentryCron('hourly-digest')
 * sendDigest() {
 *   // Uses explicit slug "hourly-digest"
 * }
 * ```
 */
export function MagnetSentryCron(
  slug?: string,
  options?: {
    schedule?: { type: 'crontab' | 'interval'; value: string }
    checkinMargin?: number
    maxRuntime?: number
    timezone?: string
  },
): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => {
    // Auto-generate slug from "ClassName-methodName" when not provided
    const monitorSlug =
      slug ??
      `${target.constructor.name}-${String(propertyKey)}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    try {
      const { SentryCron } = require('@sentry/nestjs') as {
        SentryCron: (slug: string, opts?: typeof options) => MethodDecorator
      }
      return (
        ((SentryCron(monitorSlug, options) as MethodDecorator)(
          target,
          propertyKey,
          descriptor,
        ) as PropertyDescriptor) ?? descriptor
      )
    } catch {
      // @sentry/nestjs not installed — return descriptor unchanged
      return descriptor
    }
  }
}
