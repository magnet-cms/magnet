import {
	type CallHandler,
	type ExecutionContext,
	Injectable,
	type NestInterceptor,
} from '@nestjs/common'
import { Observable } from 'rxjs'

interface RequestWithUser {
	user?: { id?: string }
	ip?: string
}

/**
 * Sentry Context Interceptor
 *
 * Runs on every HTTP request and enriches the Sentry scope with:
 * - `user.id` and `user.ip_address` from the authenticated user
 * - `requestId` tag from the EventContext (set by EventContextInterceptor)
 *
 * Context is set BEFORE calling next.handle() so that exception capture
 * in GlobalExceptionFilter always has user and requestId context attached.
 *
 * Must be registered AFTER EventContextInterceptor in the interceptor chain.
 * Registered as APP_INTERCEPTOR in SentryModule.
 *
 * No-op when @sentry/nestjs is not installed or not initialized.
 */
@Injectable()
export class SentryContextInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		if (context.getType() !== 'http') {
			return next.handle()
		}

		const request = context.switchToHttp().getRequest<RequestWithUser>()

		try {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			// biome-ignore format: split import() breaks Bun parser
			const Sentry = require('@sentry/nestjs') as typeof import('@sentry/nestjs')
			if (!Sentry.getClient()) return next.handle()

			// Set user context — available on exceptions AND successful responses
			if (request.user?.id) {
				Sentry.setUser({
					id: request.user.id,
					ip_address: request.ip,
				})
			} else {
				Sentry.setUser({ ip_address: request.ip })
			}

			// Set requestId tag before handling the request so exceptions include it.
			// EventContextInterceptor (which runs first) stores the requestId in
			// AsyncLocalStorage, so it is available synchronously here.
			try {
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				const { getEventContext } =
					require('@magnet-cms/core') as typeof import('@magnet-cms/core')
				const ctx = getEventContext()
				if (ctx?.requestId) {
					Sentry.setTag('requestId', ctx.requestId)
				}
			} catch {
				// @magnet-cms/core not available in this context — no-op
			}
		} catch {
			// @sentry/nestjs not installed — no-op
		}

		return next.handle()
	}
}
