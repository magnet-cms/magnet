import { withSentrySpan } from '../helpers/span'

/**
 * Method decorator that wraps an async method in a Sentry performance span.
 *
 * No-op when @sentry/nestjs is not installed or Sentry is not initialized.
 * The decorated method always executes regardless of Sentry availability.
 *
 * @param name - Span name (defaults to `ClassName.methodName`)
 * @param op - Span operation type (default: 'function')
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class OrderService {
 *   @SentrySpan('process-order', 'function')
 *   async processOrder(id: string): Promise<Order> {
 *     // This execution is tracked as a Sentry span
 *     return this.orderRepo.process(id)
 *   }
 * }
 * ```
 */
type AsyncMethod = (...args: unknown[]) => Promise<unknown>

/**
 * Stage 3 TC39 decorator factory compatible with both Bun and NestJS
 * (which uses emitDecoratorMetadata + experimentalDecorators).
 *
 * When used with NestJS's legacy decorator mode, TypeScript compiles this
 * as a standard method decorator. Bun's test runner also handles this correctly.
 */
export function SentrySpan(name?: string, op = 'function') {
  // Return a function that works as both a legacy (3-arg) and stage-3 (2-arg) decorator
  return function sentrySpanDecorator(
    targetOrMethod: object | AsyncMethod,
    propertyKeyOrContext?: string | symbol | ClassMethodDecoratorContext,
    descriptor?: PropertyDescriptor,
  ): PropertyDescriptor | AsyncMethod | undefined {
    // Legacy decorator form (3 args): target, key, descriptor
    if (descriptor !== undefined && typeof descriptor.value === 'function') {
      const originalMethod = descriptor.value as AsyncMethod
      const spanName = name ?? String(propertyKeyOrContext ?? 'unknown')
      descriptor.value = async function (this: unknown, ...args: unknown[]) {
        return withSentrySpan(spanName, op, () => originalMethod.apply(this, args))
      }
      return descriptor
    }

    // Stage 3 decorator form (2 args): method fn, context
    if (typeof targetOrMethod === 'function') {
      const originalMethod = targetOrMethod as AsyncMethod
      const ctx = propertyKeyOrContext as ClassMethodDecoratorContext | undefined
      const spanName = name ?? String(ctx?.name ?? 'unknown')
      return async function (this: unknown, ...args: unknown[]) {
        return withSentrySpan(spanName, op, () => originalMethod.apply(this, args))
      }
    }
  }
}
