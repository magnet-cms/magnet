import {
	PERMISSION_METADATA_KEY,
	type PermissionOptions,
	RESOLVED_PERMISSION_KEY,
	type ResolvedPermission,
} from '@magnet-cms/common'
import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from '@nestjs/common'
import type { Request } from 'express'
import type { Observable } from 'rxjs'

/**
 * Request with params
 */
interface RequestWithParams extends Request {
	params: Record<string, string>
}

/**
 * Interceptor that resolves dynamic permission placeholders.
 *
 * This interceptor runs before the PermissionGuard and resolves
 * any {param} placeholders in permission IDs with actual request parameters.
 *
 * Usage:
 * The interceptor is typically applied globally or to controllers that
 * use dynamic permission IDs.
 *
 * Example permission with placeholder:
 * ```typescript
 * @RequirePermission({
 *   id: 'content.{schema}.find',
 *   name: 'Find',
 * })
 * async find(@Param('schema') schema: string) { ... }
 * ```
 *
 * When a request comes in with schema='posts', the interceptor resolves
 * the permission ID to 'content.posts.find' and stores it for the guard.
 */
@Injectable()
export class DynamicPermissionInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<RequestWithParams>()
		const handler = context.getHandler()

		// Get permission options from the handler
		const permOptions = Reflect.getMetadata(PERMISSION_METADATA_KEY, handler) as
			| PermissionOptions
			| undefined

		// If permission has dynamic placeholders, resolve them
		if (permOptions?.id.includes('{')) {
			const resolvedPermission = this.resolvePermission(
				permOptions,
				request.params,
			)

			// Store resolved permission on the request for the guard to use
			Reflect.defineMetadata(
				RESOLVED_PERMISSION_KEY,
				resolvedPermission,
				request,
			)
		}

		return next.handle()
	}

	/**
	 * Resolve dynamic permission placeholders
	 */
	private resolvePermission(
		options: PermissionOptions,
		params: Record<string, string>,
	): ResolvedPermission {
		let resolvedId = options.id

		// Replace all {param} placeholders with actual values
		for (const [key, value] of Object.entries(params)) {
			resolvedId = resolvedId.replace(`{${key}}`, value)
		}

		return {
			...options,
			id: resolvedId,
			template: options.id,
		}
	}
}
