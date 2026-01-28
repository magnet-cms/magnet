import { SetMetadata } from '@nestjs/common'
import {
	PERMISSION_METADATA_KEY,
	PERMISSION_OPTIONS_METADATA_KEY,
} from '../../constants'
import type { PermissionOptions } from '../../types/rbac.types'

/**
 * Decorator to mark controller methods with required permissions
 *
 * The guard will check if the authenticated user's role has the specified permission.
 * Supports dynamic placeholders like `{schema}` which are resolved at runtime.
 *
 * @param options - Permission configuration
 *
 * @example
 * ```typescript
 * // Static permission
 * @Post()
 * @RequirePermission({
 *   id: 'content.posts.create',
 *   name: 'Create Posts',
 *   description: 'Create new blog posts',
 *   group: 'Content'
 * })
 * async create(@Body() data: CreatePostDto) { ... }
 *
 * // Dynamic permission with schema placeholder
 * @Get(':schema')
 * @RequirePermission({
 *   id: 'content.{schema}.find',
 *   name: 'Find',
 *   description: 'List entries',
 * })
 * async list(@Param('schema') schema: string) { ... }
 * ```
 */
export function RequirePermission(options: PermissionOptions): MethodDecorator {
	return <T>(
		target: object,
		propertyKey: string | symbol,
		descriptor: TypedPropertyDescriptor<T>,
	): TypedPropertyDescriptor<T> => {
		SetMetadata(PERMISSION_METADATA_KEY, options)(
			target,
			propertyKey,
			descriptor as TypedPropertyDescriptor<unknown>,
		)
		return descriptor
	}
}

/**
 * Decorator to mark methods that check permissions manually
 *
 * This decorator only stores the permission ID for metadata discovery.
 * The actual permission check must be done in the method implementation.
 *
 * @param permission - Permission ID to check
 *
 * @example
 * ```typescript
 * @Get('sensitive-data')
 * @HasPermission('admin.sensitive.read')
 * async getSensitiveData(): Promise<SensitiveData> {
 *   // Permission is checked by guard
 *   return this.service.getSensitiveData()
 * }
 * ```
 */
export function HasPermission(permission: string): MethodDecorator {
	return <T>(
		target: object,
		propertyKey: string | symbol,
		descriptor: TypedPropertyDescriptor<T>,
	): TypedPropertyDescriptor<T> => {
		const options: PermissionOptions = {
			id: permission,
			name: permission.split('.').pop() ?? permission,
			description: `Requires ${permission} permission`,
		}
		SetMetadata(PERMISSION_METADATA_KEY, options)(
			target,
			propertyKey,
			descriptor as TypedPropertyDescriptor<unknown>,
		)
		return descriptor
	}
}

/**
 * Decorator to provide additional permission metadata
 *
 * Can be combined with @RequirePermission for extra configuration.
 *
 * @param options - Additional permission options
 */
export function PermissionMeta(
	options: Partial<PermissionOptions>,
): MethodDecorator {
	return <T>(
		target: object,
		propertyKey: string | symbol,
		descriptor: TypedPropertyDescriptor<T>,
	): TypedPropertyDescriptor<T> => {
		SetMetadata(PERMISSION_OPTIONS_METADATA_KEY, options)(
			target,
			propertyKey,
			descriptor as TypedPropertyDescriptor<unknown>,
		)
		return descriptor
	}
}

/**
 * Helper to extract permission metadata from a method
 */
export function getPermissionMetadata(
	target: object,
	propertyKey: string | symbol,
): PermissionOptions | undefined {
	return Reflect.getMetadata(PERMISSION_METADATA_KEY, target, propertyKey) as
		| PermissionOptions
		| undefined
}

/**
 * Helper to check if a method has permission decorator
 */
export function hasPermissionDecorator(
	target: object,
	propertyKey: string | symbol,
): boolean {
	return Reflect.hasMetadata(PERMISSION_METADATA_KEY, target, propertyKey)
}
