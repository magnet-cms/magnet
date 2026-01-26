# Plan 000: Type Safety Remediation

**Status:** ✅ Completed
**Priority:** Critical (Blocker)
**Estimated Effort:** 2 weeks
**Blocks:** All other plans
**Completed:** 2026-01-25

---

## Summary

Systematically eliminate all type safety violations across the codebase. This plan MUST be completed before implementing any other plans, as type-safe foundations are required for maintainable, reliable code.

---

## Problem Statement

### Current Violations

| Category | Count | Impact |
|----------|-------|--------|
| `any` types | 40+ | Bypasses TypeScript's type checking entirely |
| `as any` assertions | 15+ | Hides type incompatibilities |
| `as unknown as T` | 5+ | Unsafe double assertions |
| `Record<string, any>` | 10+ | Loses value type information |
| `catch (error: any)` | 6+ | Unsafe error handling |
| `@ts-ignore` comments | 0 | None found (good) |

### Critical Files

```
packages/adapters/mongoose/src/mongoose.model.ts       - 15+ violations
packages/adapters/mongoose/src/mongoose.query-builder.ts - 5+ violations
packages/adapters/drizzle/src/drizzle.model.ts         - 5+ violations
packages/adapters/drizzle/src/drizzle.query-builder.ts - 5+ violations
packages/core/src/modules/auth/auth.service.ts         - 3+ violations
packages/core/src/modules/content/content.service.ts   - 3+ violations
packages/core/src/modules/settings/settings.controller.ts - 3+ violations
packages/core/src/modules/plugin/plugin.service.ts     - 3+ violations
packages/common/src/decorators/resolver/resolve.decorator.ts - 1+ violations
```

---

## Proposed Solution

### Phase 1: Type Definitions

Create proper type definitions to replace `any` patterns.

#### 1.1 Database Adapter Types

```typescript
// packages/common/src/types/database.types.ts

/**
 * Base document type that all schemas extend
 */
export interface BaseDocument {
  id: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Query filter type - replaces Record<string, any>
 */
export type QueryFilter<T> = {
  [K in keyof T]?: T[K] | QueryOperator<T[K]>
}

/**
 * Query operators for filtering
 */
export interface QueryOperator<T> {
  $eq?: T
  $ne?: T
  $gt?: T
  $gte?: T
  $lt?: T
  $lte?: T
  $in?: T[]
  $nin?: T[]
  $regex?: string
  $exists?: boolean
}

/**
 * Sort specification type
 */
export type SortSpec<T> = {
  [K in keyof T]?: 'asc' | 'desc' | 1 | -1
}

/**
 * Projection type for selecting fields
 */
export type Projection<T> = {
  [K in keyof T]?: 1 | 0 | boolean
}

/**
 * Update operations type
 */
export type UpdateOperations<T> = Partial<T> | {
  $set?: Partial<T>
  $unset?: { [K in keyof T]?: 1 | '' }
  $inc?: { [K in keyof T]?: number }
  $push?: { [K in keyof T]?: T[K] extends Array<infer U> ? U : never }
}

/**
 * Aggregation pipeline stage
 */
export interface AggregationStage {
  $match?: QueryFilter<unknown>
  $group?: GroupStage
  $sort?: Record<string, 1 | -1>
  $limit?: number
  $skip?: number
  $project?: Record<string, 0 | 1 | ProjectionExpression>
  $lookup?: LookupStage
  $unwind?: string | UnwindStage
}

interface GroupStage {
  _id: string | Record<string, string> | null
  [key: string]: unknown
}

interface LookupStage {
  from: string
  localField: string
  foreignField: string
  as: string
}

interface UnwindStage {
  path: string
  preserveNullAndEmptyArrays?: boolean
}

interface ProjectionExpression {
  $concat?: string[]
  $sum?: string | number
  $avg?: string
  [key: string]: unknown
}
```

#### 1.2 Model Interface Types

```typescript
// packages/common/src/types/model.types.ts

import type { BaseDocument, QueryFilter, SortSpec, UpdateOperations } from './database.types'

/**
 * Generic Model interface that all adapters implement
 */
export interface Model<T extends BaseDocument> {
  /**
   * Find multiple documents
   */
  find(filter?: QueryFilter<T>): QueryBuilder<T>

  /**
   * Find a single document by ID
   */
  findById(id: string): Promise<T | null>

  /**
   * Find a single document matching filter
   */
  findOne(filter: QueryFilter<T>): Promise<T | null>

  /**
   * Create a new document
   */
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>

  /**
   * Update a document by ID
   */
  updateById(id: string, data: UpdateOperations<T>): Promise<T | null>

  /**
   * Delete a document by ID
   */
  deleteById(id: string): Promise<boolean>

  /**
   * Count documents matching filter
   */
  count(filter?: QueryFilter<T>): Promise<number>
}

/**
 * Query builder interface with chainable methods
 */
export interface QueryBuilder<T> {
  where(filter: QueryFilter<T>): this
  sort(spec: SortSpec<T>): this
  limit(n: number): this
  skip(n: number): this
  select(fields: (keyof T)[]): this
  populate(field: keyof T): this
  lean(): this
  exec(): Promise<T[]>
}
```

#### 1.3 Plugin System Types

```typescript
// packages/common/src/types/plugin.types.ts

import type { Type } from '@nestjs/common'

/**
 * Plugin metadata definition
 */
export interface PluginMetadata {
  name: string
  version: string
  description?: string
  permissions?: PluginPermission[]
  settings?: Type<unknown>
  hooks?: PluginHooks
}

/**
 * Plugin permission definition
 */
export interface PluginPermission {
  id: string
  name: string
  description?: string
}

/**
 * Plugin lifecycle hooks
 */
export interface PluginHooks {
  onInit?: () => Promise<void> | void
  onDestroy?: () => Promise<void> | void
  onSchemaRegistered?: (schema: SchemaMetadata) => void
}

/**
 * Plugin instance interface
 */
export interface PluginInstance {
  metadata: PluginMetadata
  module: Type<unknown>
  initialized: boolean
}

/**
 * Schema metadata for plugins
 */
export interface SchemaMetadata {
  name: string
  apiName: string
  displayName: string
  properties: PropertyMetadata[]
}

/**
 * Property metadata
 */
export interface PropertyMetadata {
  name: string
  type: string
  required: boolean
  unique: boolean
  ui?: UIMetadata
}

/**
 * UI metadata for admin forms
 */
export interface UIMetadata {
  type: string
  label?: string
  placeholder?: string
  description?: string
  tab?: string
  group?: string
  options?: SelectOption[]
}

/**
 * Select option type
 */
export interface SelectOption {
  label: string
  value: string | number
}
```

#### 1.4 Settings Types

```typescript
// packages/common/src/types/settings.types.ts

/**
 * Settings value types - union of all possible setting values
 */
export type SettingValue = string | number | boolean | string[] | SettingObject

/**
 * Settings object type for nested settings
 */
export interface SettingObject {
  [key: string]: SettingValue
}

/**
 * Settings record with known keys
 */
export type SettingsRecord<T extends Record<string, SettingValue>> = {
  [K in keyof T]: T[K]
}

/**
 * Settings update payload
 */
export interface SettingsUpdatePayload {
  group: string
  key: string
  value: SettingValue
}

/**
 * Settings bulk update payload
 */
export interface SettingsBulkUpdatePayload {
  settings: Array<{
    key: string
    value: SettingValue
  }>
}
```

### Phase 2: Type Guards

Create type guard functions to safely narrow types.

```typescript
// packages/common/src/utils/type-guards.ts

import type { BaseDocument } from '../types/database.types'

/**
 * Check if value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Check if value has a specific property
 */
export function hasProperty<K extends string>(
  value: unknown,
  key: K
): value is Record<K, unknown> {
  return isObject(value) && key in value
}

/**
 * Check if value is a valid document with ID
 */
export function isDocument(value: unknown): value is BaseDocument {
  return (
    isObject(value) &&
    hasProperty(value, 'id') &&
    typeof value.id === 'string'
  )
}

/**
 * Check if error is a MongoDB CastError
 */
export function isCastError(error: unknown): error is { name: 'CastError'; path: string; value: unknown } {
  return (
    isObject(error) &&
    hasProperty(error, 'name') &&
    error.name === 'CastError' &&
    hasProperty(error, 'path')
  )
}

/**
 * Check if error is a MongoDB duplicate key error
 */
export function isDuplicateKeyError(error: unknown): error is { code: 11000; keyValue: Record<string, unknown> } {
  return (
    isObject(error) &&
    hasProperty(error, 'code') &&
    error.code === 11000
  )
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): error is { name: 'ValidationError'; errors: Record<string, unknown> } {
  return (
    isObject(error) &&
    hasProperty(error, 'name') &&
    error.name === 'ValidationError'
  )
}

/**
 * Check if value is a string array
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

/**
 * Assert value is defined (not null or undefined)
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'Value is null or undefined')
  }
}
```

### Phase 3: Fix Adapter Violations

#### 3.1 Mongoose Model Fixes

```typescript
// packages/adapters/mongoose/src/mongoose.model.ts

// BEFORE (line 175)
async createVersion(id: string, data: any, userId?: string): Promise<void>

// AFTER
async createVersion<T extends BaseSchema<unknown>>(
  id: string,
  data: Partial<T>,
  userId?: string
): Promise<void>

// BEFORE (line 238)
} catch (error: any) {
  if (error.name === 'CastError' && error.path === '_id') {

// AFTER
} catch (error: unknown) {
  if (isCastError(error) && error.path === '_id') {

// BEFORE (line 288)
const grouped = results.reduce((acc: any, item: any) => {

// AFTER
interface GroupedResult<T> {
  [key: string]: T[]
}
const grouped = results.reduce<GroupedResult<T>>((acc, item) => {
```

#### 3.2 Query Builder Fixes

```typescript
// packages/adapters/mongoose/src/mongoose.query-builder.ts

// BEFORE
private filterConditions: any[] = []
private sortSpecs: { column: any; direction: 'asc' | 'desc' }[] = []

// AFTER
private filterConditions: FilterQuery<T>[] = []
private sortSpecs: Array<{ column: keyof T; direction: 'asc' | 'desc' }> = []
```

#### 3.3 Drizzle Adapter Fixes

```typescript
// packages/adapters/drizzle/src/drizzle.model.ts

// BEFORE (line 75)
const tableAny = this._table as any

// AFTER
// Use proper Drizzle table types
import type { PgTable } from 'drizzle-orm/pg-core'
const table = this._table as PgTable<TableConfig>
```

### Phase 4: Fix Core Module Violations

#### 4.1 Auth Service Fixes

```typescript
// packages/core/src/modules/auth/auth.service.ts

// BEFORE (line 56)
const strategy = this.authStrategy as AuthStrategy & {
  hasUsers?: () => Promise<boolean>
}

// AFTER
interface ExtendedAuthStrategy extends AuthStrategy {
  hasUsers?(): Promise<boolean>
}

function hasHasUsersMethod(strategy: AuthStrategy): strategy is ExtendedAuthStrategy {
  return 'hasUsers' in strategy && typeof (strategy as ExtendedAuthStrategy).hasUsers === 'function'
}

// Usage
if (hasHasUsersMethod(this.authStrategy)) {
  const hasUsers = await this.authStrategy.hasUsers()
}

// BEFORE (line 84)
id: (user as any).id || (user as any)._id?.toString(),

// AFTER
interface UserDocument {
  id?: string
  _id?: { toString(): string }
}

function getUserId(user: unknown): string {
  if (!isObject(user)) throw new Error('Invalid user object')

  if (hasProperty(user, 'id') && typeof user.id === 'string') {
    return user.id
  }

  if (hasProperty(user, '_id') && isObject(user._id) && 'toString' in user._id) {
    return (user._id as { toString(): string }).toString()
  }

  throw new Error('User has no valid ID')
}
```

#### 4.2 Content Service Fixes

```typescript
// packages/core/src/modules/content/content.service.ts

// BEFORE (line 134)
const supabaseStrategy = this.authStrategy as any

// AFTER
interface SupabaseAuthStrategy extends AuthStrategy {
  getSupabaseClient(): SupabaseClient
}

function isSupabaseStrategy(strategy: AuthStrategy): strategy is SupabaseAuthStrategy {
  return 'getSupabaseClient' in strategy
}

// Usage
if (isSupabaseStrategy(this.authStrategy)) {
  const client = this.authStrategy.getSupabaseClient()
}
```

#### 4.3 Settings Controller Fixes

```typescript
// packages/core/src/modules/settings/settings.controller.ts

// BEFORE (line 44, 47, 68)
@Body() data: Record<string, any>
const results: Record<string, any> = {}
@Body('value') value: any

// AFTER
import type { SettingValue, SettingsBulkUpdatePayload } from '@magnet/common'

@Body() data: SettingsBulkUpdatePayload
const results: Record<string, SettingValue> = {}
@Body('value') value: SettingValue
```

#### 4.4 Plugin Service Fixes

```typescript
// packages/core/src/modules/plugin/plugin.service.ts

// BEFORE (line 16, 100, 104)
private plugins: Map<string, any> = new Map()
getPlugin(name: string): any
getAllPlugins(): Map<string, any>

// AFTER
import type { PluginInstance } from '@magnet/common'

private plugins: Map<string, PluginInstance> = new Map()
getPlugin(name: string): PluginInstance | undefined
getAllPlugins(): Map<string, PluginInstance>
```

### Phase 5: Fix Common Package Violations

```typescript
// packages/common/src/decorators/resolver/resolve.decorator.ts

// BEFORE (line 18)
type: optionsOrFn.map((fn) => fn()) as any,

// AFTER
type ResolverType = string | symbol | Type<unknown>

type: optionsOrFn.map((fn) => fn()) as ResolverType[],
```

### Phase 6: Fix Request Types

```typescript
// packages/core/src/modules/storage/storage.controller.ts

// BEFORE (line 66, 111)
const userId = (req as any)?.user?.id

// AFTER
// Create typed request interface
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
  }
}

// Usage
@Req() req: AuthenticatedRequest
const userId = req.user?.id
```

---

## Implementation Phases

### Phase 1: Type Definitions (Days 1-3)
- [x] Create `packages/common/src/types/database.types.ts`
- [x] Create `packages/common/src/types/model.types.ts`
- [x] Create `packages/common/src/types/plugin.types.ts`
- [x] Create `packages/common/src/types/settings.types.ts`
- [x] Update `packages/common/src/index.ts` exports

### Phase 2: Type Guards (Days 4-5)
- [x] Create `packages/common/src/utils/type-guards.ts`
- [x] Add unit tests for all type guards
- [x] Export from common package

### Phase 3: Adapter Fixes (Days 6-8)
- [x] Fix `mongoose.model.ts` (15+ violations)
- [x] Fix `mongoose.query-builder.ts` (5+ violations)
- [x] Fix `drizzle.model.ts` (5+ violations)
- [x] Fix `drizzle.query-builder.ts` (5+ violations)
- [x] Run adapter tests

### Phase 4: Core Module Fixes (Days 9-11)
- [x] Fix `auth.service.ts` (3+ violations)
- [x] Fix `content.service.ts` (3+ violations)
- [x] Fix `settings.controller.ts` (3+ violations)
- [x] Fix `plugin.service.ts` (3+ violations)
- [x] Fix `storage.controller.ts` (2+ violations)
- [x] Fix `history.controller.ts` (1+ violation)

### Phase 5: Common Package Fixes (Day 12)
- [x] Fix `resolve.decorator.ts`
- [x] Fix `config.types.ts`
- [x] Review and fix any remaining violations

### Phase 6: Verification (Days 13-14)
- [x] Run `bun run check-types` - must pass with 0 errors
- [x] Run full test suite
- [x] Manual code review for any remaining violations
- [ ] Update ESLint rules to prevent future violations (deferred - existing biome config handles this)

---

## File Changes Summary

### New Files
| Path | Description |
|------|-------------|
| `packages/common/src/types/database.types.ts` | Database operation types |
| `packages/common/src/types/model.types.ts` | Model interface types |
| `packages/common/src/types/plugin.types.ts` | Plugin system types |
| `packages/common/src/types/settings.types.ts` | Settings types |
| `packages/common/src/utils/type-guards.ts` | Type guard functions |

### Modified Files
| Path | Changes |
|------|---------|
| `packages/adapters/mongoose/src/mongoose.model.ts` | Replace 15+ `any` types |
| `packages/adapters/mongoose/src/mongoose.query-builder.ts` | Replace 5+ `any` types |
| `packages/adapters/drizzle/src/drizzle.model.ts` | Replace 5+ `any` types |
| `packages/adapters/drizzle/src/drizzle.query-builder.ts` | Replace 5+ `any` types |
| `packages/core/src/modules/auth/auth.service.ts` | Replace assertions with type guards |
| `packages/core/src/modules/content/content.service.ts` | Replace assertions with type guards |
| `packages/core/src/modules/settings/settings.controller.ts` | Use typed payloads |
| `packages/core/src/modules/plugin/plugin.service.ts` | Use typed plugin registry |
| `packages/common/src/decorators/resolver/resolve.decorator.ts` | Fix type assertion |
| `packages/common/src/index.ts` | Export new types |

---

## ESLint Configuration

Add rules to prevent future violations:

```javascript
// .eslintrc.js (or biome.json equivalent)
{
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/explicit-function-return-type': ['error', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
    }],
  }
}
```

---

## Success Criteria

1. **Zero `any` types** in the codebase
2. **Zero `as any` or `as unknown as T`** assertions
3. **Zero `catch (error: any)`** patterns
4. **`bun run check-types` passes** with 0 errors
5. **All tests pass** after changes
6. **ESLint rules** prevent future violations
7. **Type guards** used consistently for runtime checks

---

## Dependencies

- **Blocks:** All other plans (001-009)
- **Blocked by:** None

---

## Notes

This plan is marked as **Critical** and **Blocker** because:

1. Type safety is fundamental to code reliability
2. Other plans will introduce new code - it must follow type-safe patterns
3. Fixing types retroactively is harder than doing it right from the start
4. The CLAUDE.md guidelines mandate type safety - this plan enforces compliance

---

## Completion Summary

### What Was Done

All phases completed successfully:

1. **Type Definitions** - Created/updated type definitions in `@magnet-cms/common`:
   - `SettingValue` union type for type-safe settings
   - `PropDefaultValue` for schema defaults including factory functions
   - Updated `PropOptions` and other decorator types

2. **Type Guards** - Implemented in `packages/common/src/utils/type-guards.ts`:
   - `isObject`, `hasProperty`, `isDocument`
   - Error type guards: `isCastError`, `isDuplicateKeyError`, `isValidationError`
   - `isStringArray`, `assertDefined`

3. **Adapter Fixes**:
   - **Mongoose**: Fixed query builder types, error handling, and method signatures
   - **Drizzle**: Added `DrizzleCondition` type alias to work around drizzle-orm's internal type conflicts (documented library limitation)

4. **Core Module Fixes**:
   - `auth.module.ts`, `auth.service.ts`, `jwt-auth.strategy.ts`: Fixed JWT `StringValue` typing
   - `settings.controller.ts`, `settings.service.ts`: Used `SettingValue` types
   - `plugin.service.ts`: Proper plugin registry typing

5. **Common Package Fixes**:
   - `resolve.decorator.ts`: Fixed type assertions
   - `config.types.ts`: Proper async module options typing

### Known Exceptions

The drizzle adapter uses `any` types in two documented cases:
- `DynamicTable` - Drizzle tables accessed dynamically at runtime
- `DrizzleCondition` - Drizzle-orm has internal SQL type conflicts between import paths

These are documented with JSDoc comments linking to relevant drizzle-orm issues and include `eslint-disable-next-line` comments.

### Verification

- `bun run check-types` passes with 0 errors
- All packages type-check successfully:
  - `@magnet-cms/common` ✓
  - `@magnet-cms/core` ✓
  - `@magnet-cms/adapter-mongoose` ✓
  - `@magnet-cms/adapter-drizzle` ✓
  - `@magnet-cms/e2e` ✓
  - `@magnet/docs` ✓
  - `create-magnet` ✓
