# Plan 003: Users & Settings System

**Status:** Proposed
**Priority:** High
**Estimated Effort:** 3 weeks
**Depends on:** Plan 000 (Type Safety), Plan 001 (Field Decorators for @Setting.* decorators)

---

## Summary

Enhance the settings system with a unified decorator pattern and establish a module settings registration standard. All configurable modules must register their settings using `@Settings()` decorator for admin UI visibility and database persistence.

---

## Current State Analysis

### Current Settings Implementation

**`@Setting()` Decorator** - Marks class as settings schema
```typescript
// Current: Just marks class, no metadata options
@Setting()
export class Internationalization {
  @Prop({ required: true, default: 'en' })
  @UI({ type: 'select', options: locales })
  defaultLocale!: string
}
```

**SettingsService** - Already supports:
- `getSettings()` - All settings grouped
- `getSettingsByGroup(group)` - Settings by group
- `getTypedSettings<T>(group, schema)` - Type-safe retrieval
- `updateSetting(key, value)` - Update with validation

### Current User Implementation

**User Schema** - Basic fields:
```typescript
@Schema({ versioning: false, i18n: false })
export class User {
  email!: string
  password!: string
  name!: string
  role?: string  // 'admin' | 'editor' | 'viewer'
}
```

### Pain Points

1. **`@Setting()` has no options** - Can't specify group, label, icon
2. **Must use `@Prop` + `@UI` separately** - Same verbosity as schemas
3. **No `@Setting.*` field decorators** - Inconsistent with planned `@Field.*`
4. **No `@ExtendUser()` decorator** - Can't extend base user
5. **Settings discovery is implicit** - Group name derived from class name
6. **No module settings pattern** - Each module does it differently

---

## Proposed Solution

### 1. Enhanced `@Settings()` Class Decorator

```typescript
@Settings({
  group: 'email',              // Unique group identifier
  label: 'Email Settings',     // Display name in admin
  icon: 'mail',               // Lucide icon name
  order: 10,                  // Position in settings list
  description: 'Configure email delivery',
})
export class EmailSettings {
  @Setting.Select({
    label: 'Provider',
    options: ['smtp', 'sendgrid', 'resend', 'postmark'],
  })
  provider: string = 'smtp'

  @Setting.Text({ label: 'From Address', required: true })
  fromAddress: string

  @Setting.Secret({ label: 'API Key' })
  apiKey?: string
}
```

### 2. `@Setting.*` Field Decorators

Mirror `@Field.*` but optimized for settings:

```typescript
// Settings-specific decorators
Setting.Text({ label, description?, required?, placeholder? })
Setting.Number({ label, min?, max?, step? })
Setting.Boolean({ label, description? })
Setting.Select({ label, options, multiple? })
Setting.Secret({ label })        // Encrypted, masked in UI
Setting.JSON({ label, schema? }) // Raw JSON editor
Setting.Color({ label })
Setting.URL({ label })
Setting.Email({ label })
```

### 3. `@ExtendUser()` Decorator

```typescript
@ExtendUser()
export class User {
  // Base fields inherited: id, email, password, role, createdAt, updatedAt

  @Field.Text({ required: true })
  firstName: string

  @Field.Text({ required: true })
  lastName: string

  @Field.Image({ folder: 'avatars' })
  avatar?: string

  @Field.Text()
  bio?: string

  @Field.Phone()
  phone?: string

  @Field.Select({ options: ['active', 'suspended', 'pending'] })
  status: string = 'active'

  // Computed (not stored)
  get fullName() {
    return `${this.firstName} ${this.lastName}`
  }
}
```

### 4. Module Settings Registration Pattern

**Critical Pattern**: All modules with configurable options MUST register settings.

```typescript
// packages/core/src/modules/media/media.settings.ts
@Settings({
  group: 'media',
  label: 'Media Settings',
  icon: 'image',
  order: 20,
})
export class MediaSettings {
  @Setting.Number({ label: 'Max File Size (MB)', min: 1, max: 100 })
  maxFileSize: number = 10

  @Setting.Select({
    label: 'Allowed Image Types',
    options: ['jpg', 'png', 'gif', 'webp', 'svg'],
    multiple: true,
  })
  allowedImageTypes: string[] = ['jpg', 'png', 'gif', 'webp']

  @Setting.Boolean({ label: 'Auto-generate Thumbnails' })
  autoThumbnails: boolean = true

  @Setting.Number({ label: 'Thumbnail Width', min: 50, max: 500 })
  thumbnailWidth: number = 200
}

// In MediaModule
@Module({
  imports: [SettingsModule.forFeature(MediaSettings)],
  // ...
})
export class MediaModule {}

// In MediaService
@Injectable()
export class MediaService {
  constructor(private settings: SettingsService) {}

  async uploadFile(file: File) {
    const config = await this.settings.get(MediaSettings)

    if (file.size > config.maxFileSize * 1024 * 1024) {
      throw new BadRequestException('File too large')
    }
    // ...
  }
}
```

---

## Implementation Plan

### Phase 1: Enhanced Settings Decorators

**Modify: `packages/common/src/decorators/schema/settings.decorator.ts`**

```typescript
import { SETTINGS_GROUP_METADATA_KEY, SETTINGS_OPTIONS_METADATA_KEY } from '~/constants'

export interface SettingsOptions {
  /** Unique group identifier (kebab-case) */
  group: string
  /** Display label in admin UI */
  label: string
  /** Lucide icon name */
  icon?: string
  /** Position in settings list (lower = first) */
  order?: number
  /** Description shown in admin UI */
  description?: string
}

/**
 * Decorator to define a settings group
 *
 * @example
 * ```typescript
 * @Settings({
 *   group: 'email',
 *   label: 'Email Settings',
 *   icon: 'mail',
 * })
 * export class EmailSettings {
 *   @Setting.Text({ label: 'From Address' })
 *   fromAddress: string
 * }
 * ```
 */
export function Settings(options: SettingsOptions): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(SETTINGS_GROUP_METADATA_KEY, options, target)
    // Also mark as settings schema for discovery
    Reflect.defineMetadata(SETTING_METADATA_KEY, true, target)
  }
}

/**
 * Get settings options from a class
 */
export function getSettingsOptions(target: Function): SettingsOptions | undefined {
  return Reflect.getMetadata(SETTINGS_GROUP_METADATA_KEY, target)
}
```

### Phase 2: Setting Field Decorators

**New file: `packages/common/src/decorators/field/setting-field.ts`**

```typescript
import { createFieldDecorator } from './field.factory'

export interface SettingTextOptions {
  label: string
  description?: string
  required?: boolean
  placeholder?: string
  minLength?: number
  maxLength?: number
}

export interface SettingSecretOptions {
  label: string
  description?: string
  required?: boolean
}

export interface SettingSelectOptions {
  label: string
  options: string[] | { label: string; value: string }[]
  multiple?: boolean
  description?: string
  required?: boolean
}

/**
 * Setting namespace - field decorators optimized for settings
 */
export const Setting = {
  Text: createSettingDecorator<SettingTextOptions>('text'),
  Number: createSettingDecorator<SettingNumberOptions>('number'),
  Boolean: createSettingDecorator<SettingBooleanOptions>('boolean'),
  Select: createSettingDecorator<SettingSelectOptions>('select'),
  Secret: createSettingDecorator<SettingSecretOptions>('secret', {
    encrypted: true,
    masked: true,
  }),
  JSON: createSettingDecorator<SettingJSONOptions>('json'),
  Color: createSettingDecorator<SettingColorOptions>('color'),
  URL: createSettingDecorator<SettingURLOptions>('url'),
  Email: createSettingDecorator<SettingEmailOptions>('email'),
} as const

function createSettingDecorator<T extends BaseSettingOptions>(
  type: SettingType,
  defaultOptions?: Partial<T>
): (options: T) => PropertyDecorator {
  return (options: T): PropertyDecorator => {
    const merged = { ...defaultOptions, ...options }

    return (target, propertyKey) => {
      // Store setting metadata
      const existing = Reflect.getMetadata(SETTING_FIELD_METADATA_KEY, target) || []
      Reflect.defineMetadata(
        SETTING_FIELD_METADATA_KEY,
        [...existing, { propertyKey, type, options: merged }],
        target
      )

      // Also store as Prop/UI for compatibility
      const propOptions = mapSettingToProp(type, merged)
      const uiOptions = mapSettingToUI(type, merged)
      // ... apply decorators
    }
  }
}
```

### Phase 3: SettingsService Enhancements

**Modify: `packages/core/src/modules/settings/settings.service.ts`**

```typescript
@Injectable()
export class SettingsService {
  private cache = new Map<string, { data: unknown; expiry: number }>()
  private readonly CACHE_TTL = 60000 // 1 minute

  /**
   * Get typed settings for a settings class
   *
   * @example
   * ```typescript
   * const emailConfig = await settings.get(EmailSettings)
   * console.log(emailConfig.provider) // Type-safe access
   * ```
   */
  async get<T>(settingsClass: Type<T>): Promise<T> {
    const options = getSettingsOptions(settingsClass)
    if (!options) {
      throw new Error(`${settingsClass.name} is not decorated with @Settings()`)
    }

    const cacheKey = options.group
    const cached = this.cache.get(cacheKey)

    if (cached && cached.expiry > Date.now()) {
      return cached.data as T
    }

    const settings = await this.getSettingsByGroup(options.group)
    const instance = this.mapToInstance(settingsClass, settings)

    this.cache.set(cacheKey, {
      data: instance,
      expiry: Date.now() + this.CACHE_TTL,
    })

    return instance
  }

  /**
   * Update settings for a settings class
   */
  async update<T>(settingsClass: Type<T>, updates: Partial<T>): Promise<T> {
    const options = getSettingsOptions(settingsClass)
    if (!options) {
      throw new Error(`${settingsClass.name} is not decorated with @Settings()`)
    }

    // Validate updates against class validators
    await this.validateUpdates(settingsClass, updates)

    // Update each changed setting
    for (const [key, value] of Object.entries(updates)) {
      await this.updateSetting(`${options.group}.${key}`, value)
    }

    // Invalidate cache
    this.cache.delete(options.group)

    return this.get(settingsClass)
  }

  /**
   * Invalidate cache for a settings group
   */
  invalidate(settingsClass: Type<unknown>): void {
    const options = getSettingsOptions(settingsClass)
    if (options) {
      this.cache.delete(options.group)
    }
  }

  /**
   * Subscribe to settings changes (for real-time updates)
   */
  onChange<T>(settingsClass: Type<T>, callback: (settings: T) => void): () => void {
    // Implementation with EventEmitter or similar
  }
}
```

### Phase 4: @ExtendUser Decorator

**New file: `packages/common/src/decorators/schema/extend-user.decorator.ts`**

```typescript
import { EXTEND_USER_METADATA_KEY, SCHEMA_METADATA_KEY } from '~/constants'

export interface ExtendUserOptions {
  /** Whether to merge or replace base user fields */
  mode?: 'merge' | 'replace'
}

/**
 * Decorator to extend the base User schema with custom fields
 *
 * @example
 * ```typescript
 * @ExtendUser()
 * export class User {
 *   // Base fields inherited: id, email, password, role, createdAt, updatedAt
 *
 *   @Field.Text({ required: true })
 *   firstName: string
 *
 *   @Field.Image({ folder: 'avatars' })
 *   avatar?: string
 * }
 * ```
 */
export function ExtendUser(options: ExtendUserOptions = {}): ClassDecorator {
  return (target) => {
    const { mode = 'merge' } = options

    // Mark as user extension
    Reflect.defineMetadata(EXTEND_USER_METADATA_KEY, { mode }, target)

    // Also mark as schema for discovery
    Reflect.defineMetadata(SCHEMA_METADATA_KEY, true, target)
  }
}

/**
 * Check if a class extends User
 */
export function isUserExtension(target: Function): boolean {
  return Reflect.hasMetadata(EXTEND_USER_METADATA_KEY, target)
}

/**
 * Get user extension options
 */
export function getUserExtensionOptions(target: Function): ExtendUserOptions | undefined {
  return Reflect.getMetadata(EXTEND_USER_METADATA_KEY, target)
}
```

### Phase 5: User Module Enhancement

**Modify: `packages/core/src/modules/user/user.module.ts`**

```typescript
@Module({})
export class UserModule {
  private static readonly logger = new Logger(UserModule.name)

  static forRoot(): DynamicModule {
    return {
      module: UserModule,
      imports: [DatabaseModule],
      providers: [UserService, UserExtensionService],
      controllers: [UserController],
      exports: [UserService],
    }
  }

  /**
   * Register user extension
   */
  static forFeature(extensionClass: Type): DynamicModule {
    if (!isUserExtension(extensionClass)) {
      throw new Error(`${extensionClass.name} must be decorated with @ExtendUser()`)
    }

    return {
      module: UserModule,
      providers: [
        {
          provide: USER_EXTENSION_TOKEN,
          useValue: extensionClass,
        },
      ],
    }
  }
}
```

**New file: `packages/core/src/modules/user/user-extension.service.ts`**

```typescript
@Injectable()
export class UserExtensionService implements OnModuleInit {
  private mergedSchema: Type | null = null

  constructor(
    @Optional() @Inject(USER_EXTENSION_TOKEN)
    private readonly extensionClass: Type | null,
    private readonly metadataExtractor: MetadataExtractorService,
  ) {}

  async onModuleInit() {
    if (this.extensionClass) {
      this.mergedSchema = this.mergeUserSchemas(BaseUser, this.extensionClass)
    }
  }

  /**
   * Get the merged user schema (base + extension)
   */
  getMergedSchema(): Type {
    return this.mergedSchema || BaseUser
  }

  /**
   * Merge base user with extension fields
   */
  private mergeUserSchemas(base: Type, extension: Type): Type {
    // Extract field metadata from both
    const baseFields = Reflect.getMetadata(FIELD_METADATA_KEY, base.prototype) || []
    const extensionFields = Reflect.getMetadata(FIELD_METADATA_KEY, extension.prototype) || []

    // Create merged class
    class MergedUser extends base {}

    // Copy extension fields to merged class
    for (const field of extensionFields) {
      // Copy property descriptor
      const descriptor = Object.getOwnPropertyDescriptor(extension.prototype, field.propertyKey)
      if (descriptor) {
        Object.defineProperty(MergedUser.prototype, field.propertyKey, descriptor)
      }
    }

    // Merge metadata
    Reflect.defineMetadata(
      FIELD_METADATA_KEY,
      [...baseFields, ...extensionFields],
      MergedUser.prototype
    )

    return MergedUser
  }
}
```

### Phase 6: Module Settings Registration

**Create settings for all configurable modules:**

**Auth Settings:**
```typescript
// packages/core/src/modules/auth/auth.settings.ts
@Settings({
  group: 'auth',
  label: 'Authentication',
  icon: 'shield',
  order: 5,
})
export class AuthSettings {
  @Setting.Number({ label: 'Session Duration (hours)', min: 1, max: 720 })
  sessionDuration: number = 24

  @Setting.Number({ label: 'Refresh Token Duration (days)', min: 1, max: 90 })
  refreshTokenDuration: number = 7

  @Setting.Number({ label: 'Min Password Length', min: 6, max: 32 })
  minPasswordLength: number = 8

  @Setting.Boolean({ label: 'Require Uppercase' })
  requireUppercase: boolean = true

  @Setting.Boolean({ label: 'Require Number' })
  requireNumber: boolean = true

  @Setting.Boolean({ label: 'Require Special Character' })
  requireSpecialChar: boolean = false

  @Setting.Number({ label: 'Max Login Attempts', min: 3, max: 10 })
  maxLoginAttempts: number = 5

  @Setting.Number({ label: 'Lockout Duration (minutes)', min: 5, max: 60 })
  lockoutDuration: number = 15
}
```

**Media Settings:**
```typescript
// packages/core/src/modules/storage/storage.settings.ts
@Settings({
  group: 'media',
  label: 'Media & Storage',
  icon: 'image',
  order: 20,
})
export class MediaSettings {
  @Setting.Number({ label: 'Max File Size (MB)', min: 1, max: 100 })
  maxFileSize: number = 10

  @Setting.Select({
    label: 'Storage Provider',
    options: ['local', 's3', 'cloudinary', 'uploadthing'],
  })
  storageProvider: string = 'local'

  @Setting.Text({ label: 'Upload Directory' })
  uploadDirectory: string = 'uploads'

  @Setting.Select({
    label: 'Allowed Image Types',
    options: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    multiple: true,
  })
  allowedImageTypes: string[] = ['jpg', 'jpeg', 'png', 'gif', 'webp']

  @Setting.Boolean({ label: 'Auto-optimize Images' })
  autoOptimize: boolean = true

  @Setting.Number({ label: 'Image Quality (%)', min: 1, max: 100 })
  imageQuality: number = 80
}
```

**Content Settings:**
```typescript
// packages/core/src/modules/content/content.settings.ts
@Settings({
  group: 'content',
  label: 'Content Settings',
  icon: 'file-text',
  order: 15,
})
export class ContentSettings {
  @Setting.Select({
    label: 'Default Status',
    options: ['draft', 'published'],
  })
  defaultStatus: string = 'draft'

  @Setting.Boolean({ label: 'Enable Auto-save' })
  autoSave: boolean = true

  @Setting.Number({ label: 'Auto-save Interval (seconds)', min: 10, max: 300 })
  autoSaveInterval: number = 30

  @Setting.Boolean({ label: 'Require Publish Approval' })
  requireApproval: boolean = false

  @Setting.Number({ label: 'Max Revisions to Keep', min: 5, max: 100 })
  maxRevisions: number = 20
}
```

---

## API Endpoints

### Settings API

```
GET    /api/settings                    # Get all settings (grouped)
GET    /api/settings/schema             # Get all settings schemas (for admin)
GET    /api/settings/:group             # Get settings group
PUT    /api/settings/:group             # Update settings group
GET    /api/settings/:group/:key        # Get single setting
PUT    /api/settings/:group/:key        # Update single setting
```

### User API (Enhanced)

```
GET    /api/users                       # List users (admin only)
POST   /api/users                       # Create user (admin only)
GET    /api/users/:id                   # Get user by ID
PUT    /api/users/:id                   # Update user
DELETE /api/users/:id                   # Delete user (admin only)
GET    /api/users/me                    # Get current user
PUT    /api/users/me                    # Update current user
PUT    /api/users/me/password           # Change password
```

---

## File Changes Summary

### New Files
| Path | Description |
|------|-------------|
| `packages/common/src/decorators/field/setting-field.ts` | Setting.* field decorators |
| `packages/common/src/decorators/schema/extend-user.decorator.ts` | @ExtendUser decorator |
| `packages/core/src/modules/user/user-extension.service.ts` | User schema merging |
| `packages/core/src/modules/auth/auth.settings.ts` | Auth settings schema |
| `packages/core/src/modules/storage/storage.settings.ts` | Media settings schema |
| `packages/core/src/modules/content/content.settings.ts` | Content settings schema |

### Modified Files
| Path | Changes |
|------|---------|
| `packages/common/src/decorators/schema/settings.decorator.ts` | Add SettingsOptions interface |
| `packages/common/src/constants.ts` | Add new metadata keys |
| `packages/core/src/modules/settings/settings.service.ts` | Add `get<T>()`, caching, validation |
| `packages/core/src/modules/user/user.module.ts` | Add `forFeature()` for extensions |
| `packages/core/src/modules/discovery/services/schema-discovery.service.ts` | Discover user extensions |

---

## Usage Examples

### Registering Module Settings

```typescript
// 1. Create settings class
@Settings({
  group: 'webhooks',
  label: 'Webhook Settings',
  icon: 'webhook',
  order: 30,
})
export class WebhookSettings {
  @Setting.Number({ label: 'Max Retries', min: 0, max: 10 })
  maxRetries: number = 3

  @Setting.Number({ label: 'Timeout (seconds)', min: 5, max: 60 })
  timeout: number = 30

  @Setting.Boolean({ label: 'Enable Logging' })
  enableLogging: boolean = true
}

// 2. Register in module
@Module({
  imports: [SettingsModule.forFeature(WebhookSettings)],
  providers: [WebhookService],
})
export class WebhookModule {}

// 3. Use in service
@Injectable()
export class WebhookService {
  constructor(private settings: SettingsService) {}

  async sendWebhook(url: string, payload: object) {
    const config = await this.settings.get(WebhookSettings)

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.timeout * 1000),
    })

    if (!response.ok && config.maxRetries > 0) {
      // Retry logic using config.maxRetries
    }
  }
}
```

### Extending User

```typescript
// src/users/user.schema.ts
@ExtendUser()
export class User {
  @Field.Text({ required: true })
  firstName: string

  @Field.Text({ required: true })
  lastName: string

  @Field.Image({ folder: 'avatars' })
  avatar?: string

  @Field.Phone()
  phone?: string

  @Field.Select({ options: ['active', 'suspended', 'pending'] })
  status: string = 'active'

  get fullName() {
    return `${this.firstName} ${this.lastName}`
  }
}

// Register in app module
@Module({
  imports: [
    MagnetModule.forRoot({ ... }),
    UserModule.forFeature(User),
  ],
})
export class AppModule {}
```

---

## Modules That MUST Register Settings

| Module | Settings Class | Key Options |
|--------|---------------|-------------|
| Auth | `AuthSettings` | Session duration, password policy, lockout |
| Media/Storage | `MediaSettings` | File size, types, optimization |
| Content | `ContentSettings` | Default status, auto-save, revisions |
| i18n | `InternationalizationSettings` | Locales, default locale, fallback |
| Webhooks | `WebhookSettings` | Retries, timeout, logging |
| Versioning | `VersioningSettings` | Max versions, drafts, approval |

---

## Testing Strategy

### Unit Tests
```typescript
describe('SettingsService', () => {
  it('retrieves typed settings with caching')
  it('validates updates against schema')
  it('invalidates cache on update')
  it('throws for undecorated classes')
})

describe('@ExtendUser', () => {
  it('merges base and extension fields')
  it('preserves field metadata')
  it('supports computed properties')
})
```

### E2E Tests
```typescript
describe('Settings API', () => {
  it('GET /settings returns grouped settings')
  it('PUT /settings/:group updates and validates')
  it('returns 400 for invalid values')
})

describe('Extended User', () => {
  it('includes extension fields in user response')
  it('validates extension field constraints')
})
```

---

## Success Criteria

1. `@Settings()` accepts group, label, icon, order options
2. `Setting.*` decorators work like `Field.*`
3. `SettingsService.get<T>()` returns typed, cached settings
4. All core modules register their settings
5. `@ExtendUser()` merges fields with base User
6. Admin UI displays all settings with proper grouping
7. Settings are persisted and validated
