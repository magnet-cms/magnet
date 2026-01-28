# Plan 006: API Keys Module

**Status:** ✅ Completed
**Priority:** Medium
**Estimated Effort:** 1.5 weeks
**Depends on:** Plan 000 (Type Safety), Plan 007 (Auth Enhancements for guards), Plan 008 (RBAC for permission scoping)

---

## Summary

Implement scoped API keys for external integrations with rate limiting, permission control, expiration management, and usage tracking.

---

## Current State

**What Exists:** JWT-based authentication only. No API keys for programmatic access.

**What's Needed:**
- API key generation and management
- Scoped permissions per key
- Rate limiting per key
- Expiration support
- Usage tracking and analytics
- Key rotation support

---

## Proposed Implementation

### 1. API Key Schema

```typescript
@Schema({ versioning: false, i18n: false })
export class ApiKey {
  @Prop({ required: true })
  name: string  // Human-readable name

  @Prop({ required: true, unique: true, index: true })
  keyHash: string  // SHA-256 hash of the key (never store plain key)

  @Prop({ required: true })
  keyPrefix: string  // First 8 chars for identification (e.g., "mgnt_abc1")

  @Prop({ required: true, index: true })
  userId: string  // Owner of the key

  @Prop({ type: [String], default: ['*'] })
  permissions: string[]  // e.g., ['content.read', 'content.write', 'media.upload']

  @Prop({ type: [String] })
  allowedSchemas?: string[]  // Restrict to specific schemas (empty = all)

  @Prop({ type: [String] })
  allowedOrigins?: string[]  // CORS origins allowed

  @Prop({ type: [String] })
  allowedIps?: string[]  // IP whitelist

  @Prop()
  expiresAt?: Date  // Optional expiration

  @Prop({ default: true })
  enabled: boolean

  @Prop({ default: 1000 })
  rateLimit: number  // Requests per hour

  @Prop()
  description?: string

  @Prop({ default: () => new Date() })
  createdAt: Date

  @Prop()
  lastUsedAt?: Date

  @Prop({ default: 0 })
  usageCount: number

  @Prop({ type: Object })
  metadata?: Record<string, unknown>
}
```

### 2. API Key Usage Schema

```typescript
@Schema({ versioning: false, i18n: false })
export class ApiKeyUsage {
  @Prop({ required: true, index: true })
  keyId: string

  @Prop({ required: true })
  endpoint: string

  @Prop({ required: true })
  method: string

  @Prop()
  statusCode: number

  @Prop()
  responseTime: number  // ms

  @Prop()
  ipAddress?: string

  @Prop()
  userAgent?: string

  @Prop({ default: () => new Date() })
  timestamp: Date

  @Prop()
  error?: string
}
```

### 3. API Key Service

```typescript
@Injectable()
export class ApiKeyService {
  private readonly KEY_PREFIX = 'mgnt_'

  constructor(
    @Inject(API_KEY_MODEL) private model: Model<ApiKey>,
    @Inject(API_KEY_USAGE_MODEL) private usageModel: Model<ApiKeyUsage>,
    private eventService: EventService,
  ) {}

  /**
   * Create a new API key
   * Returns the plain key only once - it cannot be retrieved again
   */
  async create(userId: string, data: CreateApiKeyDto): Promise<{ key: ApiKey; plainKey: string }> {
    const plainKey = this.generateKey()
    const keyHash = this.hashKey(plainKey)
    const keyPrefix = plainKey.substring(0, 12)

    const key = await this.model.create({
      ...data,
      userId,
      keyHash,
      keyPrefix,
      permissions: data.permissions || ['*'],
    })

    await this.eventService.emit('apikey.created', {
      keyId: key._id,
      userId,
      name: data.name,
    })

    return { key, plainKey }
  }

  /**
   * Generate a secure API key
   */
  private generateKey(): string {
    const randomBytes = crypto.randomBytes(32)
    const base64 = randomBytes.toString('base64url')
    return `${this.KEY_PREFIX}${base64}`
  }

  /**
   * Hash a key for storage
   */
  private hashKey(plainKey: string): string {
    return crypto.createHash('sha256').update(plainKey).digest('hex')
  }

  /**
   * Validate an API key and return the key record
   */
  async validate(plainKey: string): Promise<ApiKey | null> {
    if (!plainKey.startsWith(this.KEY_PREFIX)) {
      return null
    }

    const keyHash = this.hashKey(plainKey)
    const key = await this.model.findOne({ keyHash, enabled: true })

    if (!key) return null

    // Check expiration
    if (key.expiresAt && key.expiresAt < new Date()) {
      return null
    }

    // Update last used
    await this.model.updateOne(
      { _id: key._id },
      {
        lastUsedAt: new Date(),
        $inc: { usageCount: 1 },
      },
    )

    return key
  }

  /**
   * Check if key has permission
   */
  hasPermission(key: ApiKey, permission: string): boolean {
    if (key.permissions.includes('*')) return true
    if (key.permissions.includes(permission)) return true

    // Check wildcards (e.g., 'content.*' matches 'content.read')
    const [resource] = permission.split('.')
    if (key.permissions.includes(`${resource}.*`)) return true

    return false
  }

  /**
   * Check if key has access to schema
   */
  hasSchemaAccess(key: ApiKey, schemaName: string): boolean {
    if (!key.allowedSchemas || key.allowedSchemas.length === 0) {
      return true
    }
    return key.allowedSchemas.includes(schemaName)
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(key: ApiKey): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const windowStart = new Date()
    windowStart.setMinutes(0, 0, 0)  // Start of current hour

    const usageCount = await this.usageModel.countDocuments({
      keyId: key._id,
      timestamp: { $gte: windowStart },
    })

    const remaining = Math.max(0, key.rateLimit - usageCount)
    const resetAt = new Date(windowStart.getTime() + 3600000)  // Next hour

    return {
      allowed: usageCount < key.rateLimit,
      remaining,
      resetAt,
    }
  }

  /**
   * Log API key usage
   */
  async logUsage(keyId: string, data: LogUsageDto): Promise<void> {
    await this.usageModel.create({
      keyId,
      ...data,
      timestamp: new Date(),
    })
  }

  /**
   * Rotate a key (invalidate old, create new)
   */
  async rotate(keyId: string): Promise<{ key: ApiKey; plainKey: string }> {
    const oldKey = await this.model.findById(keyId)
    if (!oldKey) throw new NotFoundException('API key not found')

    // Create new key with same settings
    const result = await this.create(oldKey.userId, {
      name: `${oldKey.name} (rotated)`,
      permissions: oldKey.permissions,
      allowedSchemas: oldKey.allowedSchemas,
      allowedOrigins: oldKey.allowedOrigins,
      allowedIps: oldKey.allowedIps,
      rateLimit: oldKey.rateLimit,
      description: oldKey.description,
    })

    // Disable old key
    await this.model.updateOne({ _id: keyId }, { enabled: false })

    await this.eventService.emit('apikey.rotated', {
      oldKeyId: keyId,
      newKeyId: result.key._id,
    })

    return result
  }

  /**
   * Revoke a key
   */
  async revoke(keyId: string): Promise<void> {
    await this.model.updateOne({ _id: keyId }, { enabled: false })

    await this.eventService.emit('apikey.revoked', { keyId })
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(keyId: string, days = 7): Promise<ApiKeyStats> {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const [totalRequests, successCount, errorCount, avgResponseTime] = await Promise.all([
      this.usageModel.countDocuments({ keyId, timestamp: { $gte: since } }),
      this.usageModel.countDocuments({ keyId, timestamp: { $gte: since }, statusCode: { $lt: 400 } }),
      this.usageModel.countDocuments({ keyId, timestamp: { $gte: since }, statusCode: { $gte: 400 } }),
      this.usageModel.aggregate([
        { $match: { keyId, timestamp: { $gte: since } } },
        { $group: { _id: null, avg: { $avg: '$responseTime' } } },
      ]),
    ])

    return {
      totalRequests,
      successCount,
      errorCount,
      successRate: totalRequests > 0 ? (successCount / totalRequests) * 100 : 0,
      avgResponseTime: avgResponseTime[0]?.avg || 0,
    }
  }

  // CRUD
  async findByUser(userId: string): Promise<ApiKey[]> { ... }
  async findById(id: string): Promise<ApiKey | null> { ... }
  async update(id: string, data: UpdateApiKeyDto): Promise<ApiKey> { ... }
  async delete(id: string): Promise<void> { ... }
}
```

### 4. API Key Guard

```typescript
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private apiKeyService: ApiKeyService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const response = context.switchToHttp().getResponse()

    // Check for API key in header
    const apiKey = this.extractApiKey(request)
    if (!apiKey) {
      return false
    }

    // Validate key
    const key = await this.apiKeyService.validate(apiKey)
    if (!key) {
      throw new UnauthorizedException('Invalid API key')
    }

    // Check IP whitelist
    if (key.allowedIps?.length > 0) {
      const clientIp = request.ip
      if (!key.allowedIps.includes(clientIp)) {
        throw new ForbiddenException('IP not allowed')
      }
    }

    // Check rate limit
    const rateLimit = await this.apiKeyService.checkRateLimit(key)
    response.setHeader('X-RateLimit-Limit', key.rateLimit)
    response.setHeader('X-RateLimit-Remaining', rateLimit.remaining)
    response.setHeader('X-RateLimit-Reset', rateLimit.resetAt.toISOString())

    if (!rateLimit.allowed) {
      throw new HttpException('Rate limit exceeded', 429)
    }

    // Check required permission
    const requiredPermission = this.reflector.get<string>('permission', context.getHandler())
    if (requiredPermission && !this.apiKeyService.hasPermission(key, requiredPermission)) {
      throw new ForbiddenException('Insufficient permissions')
    }

    // Attach key to request for later use
    request.apiKey = key

    return true
  }

  private extractApiKey(request: Request): string | null {
    // Check Authorization header
    const authHeader = request.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      if (token.startsWith('mgnt_')) {
        return token
      }
    }

    // Check X-API-Key header
    const apiKeyHeader = request.headers['x-api-key']
    if (apiKeyHeader) {
      return apiKeyHeader as string
    }

    return null
  }
}
```

### 5. Permission Decorator

```typescript
// Define required permission for endpoint
export const RequirePermission = (permission: string) =>
  SetMetadata('permission', permission)

// Usage in controller
@Get('posts')
@UseGuards(ApiKeyGuard)
@RequirePermission('content.read')
async getPosts() { ... }

@Post('posts')
@UseGuards(ApiKeyGuard)
@RequirePermission('content.write')
async createPost() { ... }
```

### 6. API Key Settings

```typescript
@Settings({
  group: 'api-keys',
  label: 'API Keys',
  icon: 'key',
  order: 45,
})
export class ApiKeySettings {
  @Setting.Boolean({ label: 'Enable API Keys' })
  enabled: boolean = true

  @Setting.Number({
    label: 'Default Rate Limit (per hour)',
    min: 100,
    max: 100000,
  })
  defaultRateLimit: number = 1000

  @Setting.Number({
    label: 'Max Keys Per User',
    min: 1,
    max: 100,
  })
  maxKeysPerUser: number = 10

  @Setting.Number({
    label: 'Usage Log Retention (days)',
    min: 1,
    max: 90,
  })
  usageRetentionDays: number = 30

  @Setting.Boolean({
    label: 'Require IP Whitelist',
    description: 'Force all keys to have IP restrictions',
  })
  requireIpWhitelist: boolean = false
}
```

### 7. Available Permissions

```typescript
export const API_PERMISSIONS = {
  // Content
  'content.read': 'Read content from any schema',
  'content.write': 'Create and update content',
  'content.delete': 'Delete content',
  'content.publish': 'Publish content',

  // Schema-specific (dynamic)
  'content.{schema}.read': 'Read from specific schema',
  'content.{schema}.write': 'Write to specific schema',

  // Media
  'media.read': 'Read media files',
  'media.upload': 'Upload media files',
  'media.delete': 'Delete media files',

  // Users (admin only)
  'users.read': 'Read user list',
  'users.write': 'Create and update users',

  // Settings (admin only)
  'settings.read': 'Read settings',
  'settings.write': 'Update settings',

  // Wildcards
  '*': 'Full access',
  'content.*': 'Full content access',
  'media.*': 'Full media access',
}
```

---

## API Endpoints

```
# API Key Management (requires JWT auth)
GET    /api/api-keys                      # List user's API keys
POST   /api/api-keys                      # Create new key
GET    /api/api-keys/:id                  # Get key details
PUT    /api/api-keys/:id                  # Update key
DELETE /api/api-keys/:id                  # Delete key
POST   /api/api-keys/:id/rotate           # Rotate key
POST   /api/api-keys/:id/revoke           # Revoke key

# Usage Stats
GET    /api/api-keys/:id/usage            # Get usage statistics
GET    /api/api-keys/:id/usage/history    # Get usage history
```

---

## File Changes Summary

### New Files
| Path | Description |
|------|-------------|
| `packages/core/src/modules/api-keys/api-keys.module.ts` | API Keys module |
| `packages/core/src/modules/api-keys/api-keys.service.ts` | Key management service |
| `packages/core/src/modules/api-keys/api-keys.controller.ts` | Key endpoints |
| `packages/core/src/modules/api-keys/schemas/api-key.schema.ts` | API Key schema |
| `packages/core/src/modules/api-keys/schemas/api-key-usage.schema.ts` | Usage schema |
| `packages/core/src/modules/api-keys/guards/api-key.guard.ts` | API Key guard |
| `packages/core/src/modules/api-keys/decorators/permission.decorator.ts` | Permission decorator |
| `packages/core/src/modules/api-keys/api-keys.settings.ts` | Settings |

### Modified Files
| Path | Changes |
|------|---------|
| `packages/core/src/magnet.module.ts` | Import ApiKeysModule |
| `packages/core/src/modules/content/content.controller.ts` | Add API key support |

---

## Admin UI

### API Keys Page
- List of user's API keys with status
- Create key form with permission selection
- Copy key button (only on creation)
- Usage statistics graph
- Rotate/Revoke buttons

### Key Details
- Permission checkboxes
- Schema restrictions
- IP whitelist editor
- Rate limit configuration
- Usage history table

---

## Usage Examples

### Creating an API Key

```typescript
// Via API
POST /api/api-keys
{
  "name": "My Integration",
  "permissions": ["content.read", "content.posts.write"],
  "allowedSchemas": ["posts", "categories"],
  "rateLimit": 500,
  "expiresAt": "2025-12-31T23:59:59Z"
}

// Response (key shown only once!)
{
  "id": "...",
  "name": "My Integration",
  "keyPrefix": "mgnt_abc123...",
  "plainKey": "mgnt_abc123def456ghi789...",  // SAVE THIS!
  "permissions": ["content.read", "content.posts.write"],
  ...
}
```

### Using an API Key

```bash
# Via Authorization header
curl -H "Authorization: Bearer mgnt_abc123..." https://api.example.com/content/posts

# Via X-API-Key header
curl -H "X-API-Key: mgnt_abc123..." https://api.example.com/content/posts
```

---

## Success Criteria

1. API keys can be created with scoped permissions
2. Keys are securely hashed (never stored in plain text)
3. Rate limiting enforced per key
4. IP whitelist support
5. Key expiration support
6. Usage tracking with statistics
7. Key rotation without downtime
8. Admin UI for key management
