import {
	ExecutionContext,
	SetMetadata,
	createParamDecorator,
} from '@nestjs/common'
import type { ApiKeyRequest } from '../guards/api-key.guard'
import type { ApiKey } from '../schemas/api-key.schema'

/**
 * Metadata key for required API key permission
 */
export const API_KEY_PERMISSION_KEY = 'api_key_permission'

/**
 * Metadata key for required schema access
 */
export const API_KEY_SCHEMA_KEY = 'api_key_schema'

/**
 * Decorator to require a specific permission for an API key endpoint.
 *
 * Used in conjunction with ApiKeyGuard to enforce permission-based access control.
 *
 * @param permission - The required permission (e.g., 'content.read', 'media.upload')
 *
 * @example
 * ```typescript
 * @Controller('api/content')
 * @UseGuards(ApiKeyGuard)
 * export class ContentApiController {
 *   @Get()
 *   @RequireApiKeyPermission('content.read')
 *   async list() {
 *     // Only accessible with 'content.read' or 'content.*' or '*' permission
 *   }
 *
 *   @Post()
 *   @RequireApiKeyPermission('content.write')
 *   async create() {
 *     // Only accessible with 'content.write' or 'content.*' or '*' permission
 *   }
 * }
 * ```
 */
export const RequireApiKeyPermission = (permission: string) =>
	SetMetadata(API_KEY_PERMISSION_KEY, permission)

/**
 * Decorator to require access to a specific schema for an API key endpoint.
 *
 * Used in conjunction with ApiKeyGuard to enforce schema-based access control.
 *
 * @param schema - The required schema name (e.g., 'posts', 'users')
 *
 * @example
 * ```typescript
 * @Controller('api/content/posts')
 * @UseGuards(ApiKeyGuard)
 * export class PostsApiController {
 *   @Get()
 *   @RequireApiKeySchema('posts')
 *   async list() {
 *     // Only accessible if key has 'posts' in allowedSchemas (or no restrictions)
 *   }
 * }
 * ```
 */
export const RequireApiKeySchema = (schema: string) =>
	SetMetadata(API_KEY_SCHEMA_KEY, schema)

/**
 * Parameter decorator to inject the current API key into a controller method.
 *
 * The API key is attached to the request by ApiKeyGuard after validation.
 *
 * @example
 * ```typescript
 * @Controller('api/content')
 * @UseGuards(ApiKeyGuard)
 * export class ContentApiController {
 *   @Get()
 *   async list(@CurrentApiKey() apiKey: ApiKey) {
 *     console.log(`Request from key: ${apiKey.name} (${apiKey.keyPrefix})`)
 *     // ...
 *   }
 * }
 * ```
 */
export const CurrentApiKey = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): ApiKey | undefined => {
		const request = ctx.switchToHttp().getRequest<ApiKeyRequest>()
		return request.apiKey
	},
)
