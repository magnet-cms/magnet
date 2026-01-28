import {
	type AuthUser,
	PERMISSION_METADATA_KEY,
	PermissionDeniedError,
	type PermissionOptions,
	RESOLVED_PERMISSION_KEY,
	type ResolvedPermission,
} from '@magnet-cms/common'
import {
	CanActivate,
	ExecutionContext,
	Injectable,
	Logger,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { RoleService } from '../services/role.service'

/**
 * Request with authenticated user
 */
interface AuthenticatedRequest extends Request {
	user?: AuthUser
	params: Record<string, string>
}

/**
 * Guard that checks if the authenticated user has the required permission.
 *
 * Usage:
 * ```typescript
 * @Get()
 * @UseGuards(JwtAuthGuard, PermissionGuard)
 * @RequirePermission({
 *   id: 'content.posts.find',
 *   name: 'List Posts',
 *   description: 'View list of posts',
 * })
 * async findAll() { ... }
 * ```
 *
 * Supports dynamic permission IDs with placeholders:
 * ```typescript
 * @RequirePermission({
 *   id: 'content.{schema}.find',
 *   name: 'Find',
 * })
 * async find(@Param('schema') schema: string) { ... }
 * ```
 */
@Injectable()
export class PermissionGuard implements CanActivate {
	private readonly logger = new Logger(PermissionGuard.name)

	constructor(
		private readonly reflector: Reflector,
		private readonly roleService: RoleService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
		const user = request.user

		// Get permission metadata from the handler
		const permissionOptions = this.getPermissionOptions(context, request)

		// If no permission required, allow access
		if (!permissionOptions) {
			return true
		}

		// If no user, deny access
		if (!user) {
			this.logger.debug(
				`Access denied: No authenticated user for permission ${permissionOptions.id}`,
			)
			throw new PermissionDeniedError(
				'Authentication required',
				permissionOptions.id,
			)
		}

		// Resolve dynamic permission ID (e.g., replace {schema} with actual value)
		const resolvedPermission = this.resolvePermission(
			permissionOptions,
			request.params,
		)

		// Check if user has the permission
		const hasPermission = await this.roleService.hasPermission(
			user.id,
			resolvedPermission.id,
		)

		if (!hasPermission) {
			this.logger.debug(
				`Access denied: User ${user.id} lacks permission ${resolvedPermission.id}`,
			)
			throw new PermissionDeniedError(
				`You don't have permission to ${resolvedPermission.name.toLowerCase()}`,
				resolvedPermission.id,
			)
		}

		this.logger.debug(
			`Access granted: User ${user.id} has permission ${resolvedPermission.id}`,
		)

		return true
	}

	/**
	 * Get permission options from decorator or resolved permission
	 */
	private getPermissionOptions(
		context: ExecutionContext,
		request: AuthenticatedRequest,
	): PermissionOptions | undefined {
		// First check for resolved permission (set by DynamicPermissionInterceptor)
		const resolvedPermission = Reflect.getMetadata(
			RESOLVED_PERMISSION_KEY,
			request,
		) as ResolvedPermission | undefined

		if (resolvedPermission) {
			return resolvedPermission
		}

		// Fall back to handler decorator
		return this.reflector.get<PermissionOptions>(
			PERMISSION_METADATA_KEY,
			context.getHandler(),
		)
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
			template: options.id !== resolvedId ? options.id : undefined,
		}
	}
}
