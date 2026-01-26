# Plan 008: Role-Based Access Control (RBAC)

**Status:** Proposed
**Priority:** High
**Estimated Effort:** 3 weeks
**Depends on:** Plan 000 (Type Safety), Plan 000b (Event System), Plan 007 (Auth Enhancements)

---

## Summary

Implement a comprehensive role-based access control system with:
- Dynamic permission matrix UI
- Auto-detection of decorated permissions from schemas and controllers
- Customizable roles with fine-grained permissions
- Permission inheritance and groups

---

## Current State

### What Exists
- Basic role field on User (`admin` | `editor` | `viewer`)
- No permission system
- No role management UI
- Hardcoded access checks

### New Admin Layout (Available)
- `AccessControlListingPage` - Role list with search
- `AccessControlPage` - Permission matrix editor
- `PermissionMatrix` - Grouped permission checkboxes
- `PermissionAccordion` - Collapsible permission groups
- `InfoPanel` - Role info and audit log

---

## Proposed Implementation

### 1. Permission Decorator

```typescript
// packages/common/src/decorators/permission.decorator.ts

export interface PermissionOptions {
  /** Permission identifier (e.g., 'content.posts.create') */
  id: string
  /** Human-readable name */
  name: string
  /** Description for admin UI */
  description?: string
  /** Group for organization */
  group?: string
}

/**
 * Decorator to mark controller methods with required permissions
 *
 * @example
 * ```typescript
 * @Post()
 * @RequirePermission({
 *   id: 'content.posts.create',
 *   name: 'Create Posts',
 *   description: 'Create new blog posts',
 *   group: 'Content'
 * })
 * async create(@Body() data: CreatePostDto) { ... }
 * ```
 */
export function RequirePermission(options: PermissionOptions): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Reflect.defineMetadata(PERMISSION_METADATA_KEY, options, descriptor.value)
    return descriptor
  }
}

/**
 * Check if user has permission (for manual checks)
 */
export function HasPermission(permission: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Reflect.defineMetadata(REQUIRE_PERMISSION_KEY, permission, descriptor.value)
    return descriptor
  }
}
```

### 2. Schema Permissions Auto-Generation

```typescript
// packages/core/src/modules/rbac/services/permission-discovery.service.ts

@Injectable()
export class PermissionDiscoveryService implements OnModuleInit {
  private permissions: Map<string, PermissionDefinition> = new Map()

  constructor(
    private discoveryService: DiscoveryService,
    private modulesContainer: ModulesContainer,
  ) {}

  async onModuleInit() {
    await this.discoverSchemaPermissions()
    await this.discoverControllerPermissions()
    await this.discoverPluginPermissions()
  }

  /**
   * Auto-generate CRUD permissions for each schema
   */
  private async discoverSchemaPermissions() {
    const schemas = this.discoveryService.getAllDiscoveredSchemas()

    for (const schema of schemas) {
      const schemaName = schema.name
      const apiName = schema.apiName  // kebab-case

      // Standard CRUD permissions
      const crudPermissions = [
        {
          id: `content.${apiName}.find`,
          name: 'Find',
          description: `Get a list of ${schema.displayName}`,
        },
        {
          id: `content.${apiName}.findOne`,
          name: 'Find One',
          description: `Get a specific ${schema.displayName}`,
        },
        {
          id: `content.${apiName}.create`,
          name: 'Create',
          description: `Create a new ${schema.displayName}`,
        },
        {
          id: `content.${apiName}.update`,
          name: 'Update',
          description: `Update a ${schema.displayName}`,
        },
        {
          id: `content.${apiName}.delete`,
          name: 'Delete',
          description: `Delete a ${schema.displayName}`,
        },
        {
          id: `content.${apiName}.publish`,
          name: 'Publish',
          description: `Publish a ${schema.displayName}`,
        },
      ]

      for (const perm of crudPermissions) {
        this.permissions.set(perm.id, {
          ...perm,
          group: 'Collection Types',
          schema: schemaName,
          apiId: `api::${apiName}`,
        })
      }
    }
  }

  /**
   * Discover @RequirePermission decorated methods
   */
  private async discoverControllerPermissions() {
    const controllers = this.modulesContainer.getModules()

    for (const [, module] of controllers) {
      for (const [, controller] of module.controllers) {
        const instance = controller.instance
        const prototype = Object.getPrototypeOf(instance)

        for (const methodName of Object.getOwnPropertyNames(prototype)) {
          const method = prototype[methodName]
          const permMetadata = Reflect.getMetadata(PERMISSION_METADATA_KEY, method)

          if (permMetadata) {
            this.permissions.set(permMetadata.id, {
              ...permMetadata,
              source: 'controller',
              controller: controller.name,
              method: methodName,
            })
          }
        }
      }
    }
  }

  /**
   * Discover plugin permissions
   */
  private async discoverPluginPermissions() {
    const plugins = this.pluginRegistry.getAll()

    for (const plugin of plugins) {
      const pluginPerms = plugin.metadata.permissions || []

      for (const perm of pluginPerms) {
        this.permissions.set(perm.id, {
          ...perm,
          group: 'Plugins',
          plugin: plugin.name,
          apiId: `plugin::${plugin.name}`,
        })
      }
    }
  }

  /**
   * Get all discovered permissions grouped
   */
  getPermissions(): PermissionGroup[] {
    const groups: Map<string, PermissionGroup> = new Map()

    for (const [id, perm] of this.permissions) {
      const groupKey = perm.apiId || perm.group || 'Other'

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          id: groupKey,
          name: perm.schema || perm.plugin || perm.group || 'Other',
          apiId: perm.apiId || groupKey,
          permissions: [],
        })
      }

      groups.get(groupKey)!.permissions.push({
        id,
        name: perm.name,
        description: perm.description || '',
      })
    }

    return Array.from(groups.values())
  }

  /**
   * Get permissions by category (Collection Types, Plugins, etc.)
   */
  getPermissionsByCategory(): {
    collectionTypes: PermissionGroup[]
    plugins: PermissionGroup[]
    system: PermissionGroup[]
  } {
    const all = this.getPermissions()

    return {
      collectionTypes: all.filter((g) => g.apiId?.startsWith('api::')),
      plugins: all.filter((g) => g.apiId?.startsWith('plugin::')),
      system: all.filter((g) => !g.apiId?.includes('::')),
    }
  }
}
```

### 3. Role Schema

```typescript
@Schema({ versioning: false, i18n: false })
export class Role {
  @Prop({ required: true, unique: true })
  name: string  // e.g., 'authenticated', 'editor', 'admin'

  @Prop({ required: true })
  displayName: string  // e.g., 'Authenticated Role'

  @Prop()
  description?: string

  @Prop({ type: [String], default: [] })
  permissions: string[]  // Array of permission IDs

  @Prop({ default: false })
  isSystem: boolean  // System roles can't be deleted

  @Prop({ default: () => new Date() })
  createdAt: Date

  @Prop()
  updatedAt?: Date
}
```

### 4. Role Service

```typescript
@Injectable()
export class RoleService {
  constructor(
    @Inject(ROLE_MODEL) private model: Model<Role>,
    private permissionDiscovery: PermissionDiscoveryService,
    private eventService: EventService,
  ) {}

  /**
   * Create default roles on init
   */
  async onModuleInit() {
    await this.ensureDefaultRoles()
  }

  private async ensureDefaultRoles() {
    const defaultRoles = [
      {
        name: 'admin',
        displayName: 'Admin Role',
        description: 'Full access to all features and settings.',
        permissions: ['*'],  // Wildcard = all permissions
        isSystem: true,
      },
      {
        name: 'authenticated',
        displayName: 'Authenticated Role',
        description: 'Default role given to authenticated users.',
        permissions: [],
        isSystem: true,
      },
      {
        name: 'public',
        displayName: 'Public Role',
        description: 'Default role for unauthenticated users.',
        permissions: [],
        isSystem: true,
      },
    ]

    for (const role of defaultRoles) {
      const exists = await this.model.findOne({ name: role.name })
      if (!exists) {
        await this.model.create(role)
      }
    }
  }

  /**
   * Check if user has permission
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const user = await this.userService.findOneById(userId)
    if (!user?.role) return false

    const role = await this.model.findOne({ name: user.role })
    if (!role) return false

    // Admin has all permissions
    if (role.permissions.includes('*')) return true

    // Check exact match
    if (role.permissions.includes(permission)) return true

    // Check wildcard (e.g., 'content.*' matches 'content.posts.create')
    const parts = permission.split('.')
    for (let i = parts.length - 1; i > 0; i--) {
      const wildcard = [...parts.slice(0, i), '*'].join('.')
      if (role.permissions.includes(wildcard)) return true
    }

    return false
  }

  /**
   * Get role with resolved permissions
   */
  async getRoleWithPermissions(roleId: string): Promise<RoleWithPermissions> {
    const role = await this.model.findById(roleId)
    if (!role) throw new NotFoundException('Role not found')

    const allPermissions = this.permissionDiscovery.getPermissionsByCategory()

    // Mark which permissions are enabled for this role
    const markPermissions = (groups: PermissionGroup[]) =>
      groups.map((group) => ({
        ...group,
        permissions: group.permissions.map((p) => ({
          ...p,
          checked: this.isPermissionEnabled(role.permissions, p.id),
        })),
      }))

    return {
      ...role.toObject(),
      collectionTypes: markPermissions(allPermissions.collectionTypes),
      plugins: markPermissions(allPermissions.plugins),
      system: markPermissions(allPermissions.system),
    }
  }

  private isPermissionEnabled(rolePermissions: string[], permissionId: string): boolean {
    if (rolePermissions.includes('*')) return true
    if (rolePermissions.includes(permissionId)) return true

    // Check wildcards
    const parts = permissionId.split('.')
    for (let i = parts.length - 1; i > 0; i--) {
      const wildcard = [...parts.slice(0, i), '*'].join('.')
      if (rolePermissions.includes(wildcard)) return true
    }

    return false
  }

  /**
   * Update role permissions
   */
  async updatePermissions(roleId: string, permissions: string[]): Promise<Role> {
    const role = await this.model.findByIdAndUpdate(
      roleId,
      { permissions, updatedAt: new Date() },
      { new: true },
    )

    if (!role) throw new NotFoundException('Role not found')

    await this.eventService.emit('role.permissions_updated', {
      roleId,
      permissions,
    })

    return role
  }

  /**
   * Duplicate a role
   */
  async duplicate(roleId: string, newName: string): Promise<Role> {
    const source = await this.model.findById(roleId)
    if (!source) throw new NotFoundException('Role not found')

    const newRole = await this.model.create({
      name: newName.toLowerCase().replace(/\s+/g, '-'),
      displayName: newName,
      description: `Copy of ${source.displayName}`,
      permissions: [...source.permissions],
      isSystem: false,
    })

    await this.eventService.emit('role.created', { roleId: newRole._id })

    return newRole
  }

  // CRUD
  async findAll(): Promise<Role[]> { ... }
  async findById(id: string): Promise<Role | null> { ... }
  async findByName(name: string): Promise<Role | null> { ... }
  async create(data: CreateRoleDto): Promise<Role> { ... }
  async update(id: string, data: UpdateRoleDto): Promise<Role> { ... }
  async delete(id: string): Promise<void> { ... }
}
```

### 5. Permission Guard

```typescript
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private roleService: RoleService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) {
      return false
    }

    // Get required permission from decorator
    const permissionOptions = this.reflector.get<PermissionOptions>(
      PERMISSION_METADATA_KEY,
      context.getHandler(),
    )

    if (!permissionOptions) {
      // No permission required
      return true
    }

    // Check permission
    const hasPermission = await this.roleService.hasPermission(
      user.id,
      permissionOptions.id,
    )

    if (!hasPermission) {
      throw new ForbiddenException(
        `You don't have permission to ${permissionOptions.name.toLowerCase()}`
      )
    }

    return true
  }
}
```

### 6. Content Controller with Permissions

```typescript
// Type-safe content DTOs
interface CreateContentDto {
  data: Record<string, unknown>
  locale?: string
  status?: 'draft' | 'published'
}

interface UpdateContentDto {
  data: Record<string, unknown>
  locale?: string
}

interface ContentResponse<T = Record<string, unknown>> {
  id: string
  data: T
  locale: string
  status: 'draft' | 'published'
  createdAt: Date
  updatedAt: Date
}

@Controller('content/:schema')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ContentController {
  @Get()
  @RequirePermission({
    id: 'content.{schema}.find',  // {schema} replaced at runtime
    name: 'Find',
    description: 'Get a list of entries',
  })
  async find(@Param('schema') schema: string): Promise<ContentResponse[]> { ... }

  @Post()
  @RequirePermission({
    id: 'content.{schema}.create',
    name: 'Create',
    description: 'Create a new entry',
  })
  async create(
    @Param('schema') schema: string,
    @Body() dto: CreateContentDto
  ): Promise<ContentResponse> { ... }

  @Put(':id')
  @RequirePermission({
    id: 'content.{schema}.update',
    name: 'Update',
    description: 'Update an entry',
  })
  async update(
    @Param('schema') schema: string,
    @Param('id') id: string,
    @Body() dto: UpdateContentDto
  ): Promise<ContentResponse> { ... }

  @Delete(':id')
  @RequirePermission({
    id: 'content.{schema}.delete',
    name: 'Delete',
    description: 'Delete an entry',
  })
  async delete(
    @Param('schema') schema: string,
    @Param('id') id: string
  ): Promise<{ deleted: boolean }> { ... }

  @Post(':id/publish')
  @RequirePermission({
    id: 'content.{schema}.publish',
    name: 'Publish',
    description: 'Publish an entry',
  })
  async publish(
    @Param('schema') schema: string,
    @Param('id') id: string
  ): Promise<ContentResponse> { ... }
}
```

### 7. Dynamic Permission Resolution

```typescript
@Injectable()
export class DynamicPermissionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const handler = context.getHandler()

    const permOptions = Reflect.getMetadata(PERMISSION_METADATA_KEY, handler)

    if (permOptions && permOptions.id.includes('{schema}')) {
      const schema = request.params.schema
      const resolvedId = permOptions.id.replace('{schema}', schema)

      // Update metadata for this request
      Reflect.defineMetadata(
        RESOLVED_PERMISSION_KEY,
        { ...permOptions, id: resolvedId },
        request,
      )
    }

    return next.handle()
  }
}
```

### 8. RBAC Settings

```typescript
@Settings({
  group: 'rbac',
  label: 'Access Control',
  icon: 'shield-check',
  order: 30,
})
export class RBACSettings {
  @Setting.Boolean({
    label: 'Enable RBAC',
    description: 'Enable role-based access control',
  })
  enabled: boolean = true

  @Setting.Select({
    label: 'Default User Role',
    options: ['authenticated', 'viewer', 'editor'],
  })
  defaultUserRole: string = 'authenticated'

  @Setting.Boolean({
    label: 'Allow Public Access',
    description: 'Allow unauthenticated users with public role permissions',
  })
  allowPublicAccess: boolean = false

  @Setting.Boolean({
    label: 'Cache Permissions',
    description: 'Cache permission checks for better performance',
  })
  cachePermissions: boolean = true

  @Setting.Number({
    label: 'Cache TTL (seconds)',
    min: 60,
    max: 3600,
  })
  cacheTTL: number = 300
}
```

---

## API Endpoints

```
# Roles
GET    /api/rbac/roles                    # List all roles
POST   /api/rbac/roles                    # Create role
GET    /api/rbac/roles/:id                # Get role with permissions
PUT    /api/rbac/roles/:id                # Update role
DELETE /api/rbac/roles/:id                # Delete role (non-system only)
POST   /api/rbac/roles/:id/duplicate      # Duplicate role

# Permissions
GET    /api/rbac/permissions              # Get all discovered permissions
PUT    /api/rbac/roles/:id/permissions    # Update role permissions

# User Role
PUT    /api/users/:id/role                # Assign role to user
```

---

## File Changes Summary

### New Files
| Path | Description |
|------|-------------|
| `packages/common/src/decorators/permission.decorator.ts` | Permission decorators |
| `packages/common/src/types/rbac.types.ts` | RBAC type definitions |
| `packages/core/src/modules/rbac/rbac.module.ts` | RBAC module |
| `packages/core/src/modules/rbac/services/role.service.ts` | Role management |
| `packages/core/src/modules/rbac/services/permission-discovery.service.ts` | Permission discovery |
| `packages/core/src/modules/rbac/guards/permission.guard.ts` | Permission guard |
| `packages/core/src/modules/rbac/schemas/role.schema.ts` | Role schema |
| `packages/core/src/modules/rbac/rbac.controller.ts` | RBAC endpoints |
| `packages/core/src/modules/rbac/rbac.settings.ts` | RBAC settings |

### Modified Files
| Path | Changes |
|------|---------|
| `packages/core/src/modules/content/content.controller.ts` | Add permission decorators |
| `packages/core/src/modules/user/schemas/user.schema.ts` | Role reference |
| `packages/core/src/magnet.module.ts` | Import RBACModule |

---

## Admin UI Integration

The new admin layout already includes:

### Access Control Listing (`AccessControlListingPage`)
- Role list with search
- User count per role
- Last updated timestamp
- Create new role button

### Permission Matrix (`AccessControlPage`)
- Role header with save/duplicate buttons
- Tabs: Permissions / Advanced Settings
- Search permissions
- Collection Types group
- Plugins group
- Select all per group
- Info panel with audit log

---

## Permission ID Format

```
{category}.{resource}.{action}

Examples:
- content.posts.create
- content.posts.find
- content.medical-record.publish
- media.upload
- media.delete
- users.find
- users.create
- settings.read
- settings.write
- plugin.content-builder.access
```

---

## Type Safety Requirements

### Permission Types

```typescript
// packages/common/src/types/rbac.types.ts

/**
 * Permission definition
 */
export interface PermissionDefinition {
  id: string
  name: string
  description?: string
  group?: string
  schema?: string
  apiId?: string
  source?: 'schema' | 'controller' | 'plugin'
  controller?: string
  method?: string
  plugin?: string
}

/**
 * Permission group for UI display
 */
export interface PermissionGroup {
  id: string
  name: string
  apiId?: string
  permissions: PermissionItem[]
}

/**
 * Permission item with checked state
 */
export interface PermissionItem {
  id: string
  name: string
  description: string
  checked?: boolean
}

/**
 * Role with resolved permissions
 */
export interface RoleWithPermissions {
  id: string
  name: string
  displayName: string
  description?: string
  permissions: string[]
  isSystem: boolean
  createdAt: Date
  updatedAt?: Date
  collectionTypes: PermissionGroup[]
  plugins: PermissionGroup[]
  system: PermissionGroup[]
}

/**
 * Create role DTO
 */
export interface CreateRoleDto {
  name: string
  displayName: string
  description?: string
  permissions?: string[]
}

/**
 * Update role DTO
 */
export interface UpdateRoleDto {
  displayName?: string
  description?: string
}

/**
 * Update permissions DTO
 */
export interface UpdatePermissionsDto {
  permissions: string[]
}
```

### Type Safety Checklist

- [ ] All DTOs have explicit type definitions (no `any`)
- [ ] Permission discovery returns typed `PermissionDefinition[]`
- [ ] Role service methods have explicit return types
- [ ] Permission guard uses type-safe permission checking
- [ ] Event payloads use types from Plan 000b
- [ ] `bun run check-types` passes with 0 errors

---

## Success Criteria

1. Permissions auto-discovered from schemas
2. `@RequirePermission` decorator works on controllers
3. Dynamic permission resolution for schema routes
4. Role CRUD with system role protection
5. Permission matrix UI updates role permissions
6. Permission guard enforces access
7. Wildcard permissions work (`content.*`)
8. Default roles created on init
9. **Zero `any` types** in RBAC implementation
10. **All DTOs properly typed** with explicit interfaces

---

## Dependencies

- **Depends on:** Plan 000 (Type Safety), Plan 000b (Event System), Plan 007 (Auth Enhancements)
- **Blocks:** Plan 009 (Admin Layout) - needs RBAC API for Access Control UI
