# Plan 000c: Unified Adapter Contract

**Status:** ✅ Completed
**Priority:** Critical
**Estimated Effort:** 2 weeks
**Depends on:** Plan 000 (Type Safety Remediation)

---

## Summary

Define and enforce a unified database adapter contract ensuring all adapters (Mongoose, Drizzle, future adapters) implement identical APIs with consistent behavior. This eliminates adapter-specific code paths and guarantees interchangeable adapters.

---

## Problem Statement

### Current Inconsistencies

| Feature | Mongoose | Drizzle | Issue |
|---------|----------|---------|-------|
| `isVersioningEnabled()` | Returns `false` | Not implemented | **API mismatch** |
| `createVersion()` | Full implementation | Not implemented | **API mismatch** |
| `onModuleDestroy()` | Not implemented | Closes pool | Memory leak risk |
| `native()` return | `Model` instance | `{ db, table }` tuple | **Different types** |
| Token function | `getModelToken()` | `getDrizzleModelToken()` | Inconsistent naming |
| Connection pattern | Async NestJS module | Sync pool + async Neon | Different patterns |
| Versioning philosophy | Model-aware | Delegates to HistoryService | Design mismatch |
| Error handling | Mongoose-specific | PostgreSQL error codes | No common errors |

### Real-World Problems

```typescript
// This code fails silently with Drizzle
const model = await this.contentService.getModel(schema)
if (model.isVersioningEnabled()) {  // ❌ Drizzle: TypeError - method doesn't exist
  await model.createVersion(data)   // ❌ Drizzle: TypeError - method doesn't exist
}

// Native access is adapter-specific
const native = model.native()
native.find({})  // ✅ Mongoose - works
native.db.select()  // ✅ Drizzle - works
// Developer must know which adapter is in use!
```

---

## Proposed Solution

### 1. Core Adapter Interface

```typescript
// packages/common/src/types/adapter.types.ts

import type { DynamicModule, Type, OnModuleDestroy } from '@nestjs/common'
import type { MagnetModuleOptions } from './config.types'

/**
 * Database adapter contract - all adapters MUST implement this interface
 */
export interface DatabaseAdapter extends OnModuleDestroy {
  /**
   * Adapter identifier
   */
  readonly name: AdapterName

  /**
   * Connect to database and return NestJS dynamic module
   */
  connect(options: MagnetModuleOptions): DynamicModule

  /**
   * Register schemas as features
   */
  forFeature(schemas: Type | Type[]): DynamicModule

  /**
   * Wrap a schema instance with adapter's Model implementation
   */
  model<T extends BaseSchema>(modelInstance: unknown): Model<T>

  /**
   * Get injection token for a schema
   */
  token(schema: string): string

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): Promise<void>

  /**
   * Check if adapter supports a feature
   */
  supports(feature: AdapterFeature): boolean

  /**
   * Get adapter capabilities
   */
  getCapabilities(): AdapterCapabilities
}

/**
 * Supported adapter names
 */
export type AdapterName = 'mongoose' | 'drizzle' | 'prisma' | 'typeorm'

/**
 * Features an adapter may support
 */
export type AdapterFeature =
  | 'transactions'
  | 'nested-transactions'
  | 'json-queries'
  | 'full-text-search'
  | 'geospatial'
  | 'change-streams'
  | 'migrations'

/**
 * Adapter capability declaration
 */
export interface AdapterCapabilities {
  /** Supported database types */
  databases: DatabaseType[]
  /** Supported features */
  features: AdapterFeature[]
  /** Whether adapter handles its own versioning */
  handlesVersioning: boolean
  /** Whether adapter supports lazy table/collection creation */
  supportsLazyCreation: boolean
}

export type DatabaseType =
  | 'mongodb'
  | 'postgresql'
  | 'mysql'
  | 'sqlite'
  | 'mssql'
```

### 2. Unified Model Interface

```typescript
// packages/common/src/model/model.interface.ts

import type { QueryBuilder } from './query-builder.interface'

/**
 * Model interface - all adapter models MUST implement this
 */
export interface Model<T extends BaseSchema> {
  // ============= CRUD Operations =============

  /**
   * Create a new document/record
   */
  create(data: CreateInput<T>, options?: CreateOptions): Promise<T>

  /**
   * Find all documents/records
   */
  find(options?: FindOptions): Promise<T[]>

  /**
   * Find document by ID
   */
  findById(id: string): Promise<T | null>

  /**
   * Find single document by query
   */
  findOne(query: FilterQuery<T>): Promise<T | null>

  /**
   * Find multiple documents by query
   */
  findMany(query: FilterQuery<T>, options?: FindOptions): Promise<T[]>

  /**
   * Update documents matching query
   */
  update(
    query: FilterQuery<T>,
    data: UpdateInput<T>,
    options?: UpdateOptions
  ): Promise<T>

  /**
   * Delete documents matching query
   */
  delete(query: FilterQuery<T>): Promise<boolean>

  // ============= Locale & Versioning =============

  /**
   * Set locale for subsequent operations
   * @returns Cloned model instance with locale set
   */
  locale(locale: string): this

  /**
   * Get current locale
   */
  getLocale(): string

  /**
   * Set version for subsequent operations
   * @returns Same instance (chainable)
   */
  version(versionId: string): this

  /**
   * Check if versioning is enabled for this model
   */
  isVersioningEnabled(): boolean

  /**
   * Create a version snapshot of a document
   * @returns Version record or null if versioning disabled
   */
  createVersion(documentId: string, data: Partial<T>): Promise<VersionRecord | null>

  /**
   * Find all versions of a document
   */
  findVersions(documentId: string): Promise<VersionRecord[]>

  /**
   * Find a specific version by ID
   */
  findVersionById(versionId: string): Promise<VersionRecord | null>

  /**
   * Restore a document to a specific version
   */
  restoreVersion(versionId: string): Promise<T | null>

  // ============= Query Builder =============

  /**
   * Get query builder for complex queries
   */
  query(): QueryBuilder<T>

  // ============= Native Access =============

  /**
   * Get native adapter instance
   * @returns Typed native access object
   */
  native(): NativeAccess<T>

  // ============= Metadata =============

  /**
   * Get schema name
   */
  getSchemaName(): string

  /**
   * Get schema metadata
   */
  getMetadata(): SchemaMetadata
}

/**
 * Native access wrapper - provides type-safe native operations
 */
export interface NativeAccess<T> {
  /**
   * Raw database/ORM instance (type varies by adapter)
   */
  readonly raw: unknown

  /**
   * Execute raw query (adapter-specific syntax)
   */
  rawQuery<R = unknown>(query: string, params?: unknown[]): Promise<R>

  /**
   * Get adapter name for adapter-specific code
   */
  readonly adapterName: AdapterName
}

/**
 * Version record structure
 */
export interface VersionRecord {
  id: string
  documentId: string
  schemaName: string
  data: Record<string, unknown>
  createdAt: Date
  createdBy?: string
  changeType: 'create' | 'update' | 'restore'
}
```

### 3. Unified Query Builder Interface

```typescript
// packages/common/src/model/query-builder.interface.ts

/**
 * Query builder interface - all adapters MUST implement this
 */
export interface QueryBuilder<T extends BaseSchema> {
  // ============= Filtering =============

  /**
   * Add where condition
   */
  where(field: keyof T | string, operator: QueryOperator, value: unknown): this
  where(conditions: FilterQuery<T>): this

  /**
   * Add AND conditions
   */
  and(conditions: FilterQuery<T>[]): this

  /**
   * Add OR conditions
   */
  or(conditions: FilterQuery<T>[]): this

  // ============= Ordering =============

  /**
   * Sort results
   */
  sort(field: keyof T | string, direction: 'asc' | 'desc'): this
  sort(sorts: SortSpec<T>): this

  // ============= Pagination =============

  /**
   * Limit results
   */
  limit(count: number): this

  /**
   * Skip results (offset)
   */
  skip(count: number): this

  /**
   * Get paginated results
   */
  paginate(page: number, perPage: number): Promise<PaginatedResult<T>>

  // ============= Field Selection =============

  /**
   * Select specific fields
   */
  select(fields: (keyof T | string)[]): this

  /**
   * Exclude specific fields
   */
  exclude(fields: (keyof T | string)[]): this

  // ============= Locale & Version =============

  /**
   * Set locale for query
   */
  locale(locale: string): this

  /**
   * Set version for query
   */
  version(versionId: string): this

  // ============= Execution =============

  /**
   * Execute query and return all results
   */
  exec(): Promise<T[]>

  /**
   * Execute query and return first result
   */
  execOne(): Promise<T | null>

  /**
   * Count matching documents
   */
  count(): Promise<number>

  /**
   * Check if any documents match
   */
  exists(): Promise<boolean>
}

/**
 * Query operators
 */
export type QueryOperator =
  | 'eq' | 'ne'           // Equality
  | 'gt' | 'gte'          // Greater than
  | 'lt' | 'lte'          // Less than
  | 'in' | 'nin'          // Array membership
  | 'contains' | 'startsWith' | 'endsWith'  // String
  | 'exists'              // Field existence
  | 'regex'               // Regular expression

/**
 * Sort specification
 */
export type SortSpec<T> = {
  [K in keyof T]?: 'asc' | 'desc'
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}
```

### 4. Unified Error Types

```typescript
// packages/common/src/types/adapter-errors.types.ts

/**
 * Base adapter error
 */
export abstract class AdapterError extends Error {
  abstract readonly code: AdapterErrorCode
  abstract readonly adapterName: AdapterName

  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Error codes for adapter operations
 */
export enum AdapterErrorCode {
  // Connection errors (1xxx)
  CONNECTION_FAILED = 1001,
  CONNECTION_TIMEOUT = 1002,
  CONNECTION_CLOSED = 1003,

  // Query errors (2xxx)
  INVALID_QUERY = 2001,
  QUERY_TIMEOUT = 2002,

  // Document errors (3xxx)
  DOCUMENT_NOT_FOUND = 3001,
  DUPLICATE_KEY = 3002,
  VALIDATION_FAILED = 3003,
  CAST_ERROR = 3004,

  // Transaction errors (4xxx)
  TRANSACTION_FAILED = 4001,
  TRANSACTION_ABORTED = 4002,

  // Schema errors (5xxx)
  SCHEMA_NOT_FOUND = 5001,
  INVALID_SCHEMA = 5002,
}

/**
 * Document not found error
 */
export class DocumentNotFoundError extends AdapterError {
  readonly code = AdapterErrorCode.DOCUMENT_NOT_FOUND

  constructor(
    public readonly adapterName: AdapterName,
    public readonly schemaName: string,
    public readonly documentId: string
  ) {
    super(`Document not found: ${schemaName}/${documentId}`)
  }
}

/**
 * Duplicate key error
 */
export class DuplicateKeyError extends AdapterError {
  readonly code = AdapterErrorCode.DUPLICATE_KEY

  constructor(
    public readonly adapterName: AdapterName,
    public readonly schemaName: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(`Duplicate key: ${schemaName}.${field} = ${String(value)}`)
  }
}

/**
 * Validation error
 */
export class AdapterValidationError extends AdapterError {
  readonly code = AdapterErrorCode.VALIDATION_FAILED

  constructor(
    public readonly adapterName: AdapterName,
    public readonly schemaName: string,
    public readonly errors: ValidationErrorDetail[]
  ) {
    super(`Validation failed for ${schemaName}: ${errors.map(e => e.message).join(', ')}`)
  }
}

export interface ValidationErrorDetail {
  field: string
  message: string
  value?: unknown
}
```

### 5. Token Generation (Unified)

```typescript
// packages/common/src/utils/tokens.util.ts

/**
 * Get model injection token for any adapter
 * Replaces adapter-specific functions
 */
export function getModelToken(schemaName: string): string {
  return `MAGNET_MODEL_${schemaName.toUpperCase()}`
}

/**
 * Get schema injection token
 */
export function getSchemaToken(schemaName: string): string {
  return `MAGNET_SCHEMA_${schemaName.toUpperCase()}`
}

/**
 * Get adapter injection token
 */
export function getAdapterToken(): string {
  return 'MAGNET_DATABASE_ADAPTER'
}
```

---

## Migration Strategy

### Phase 1: Define Contracts (Days 1-3)

- [ ] Create `packages/common/src/types/adapter.types.ts`
- [ ] Create `packages/common/src/model/model.interface.ts`
- [ ] Create `packages/common/src/model/query-builder.interface.ts`
- [ ] Create `packages/common/src/types/adapter-errors.types.ts`
- [ ] Update `packages/common/src/utils/tokens.util.ts`
- [ ] Export all from `packages/common/src/index.ts`

### Phase 2: Update Mongoose Adapter (Days 4-6)

- [ ] Implement `onModuleDestroy()` for connection cleanup
- [ ] Update `native()` to return `NativeAccess<T>` type
- [ ] Use unified token generation
- [ ] Map Mongoose errors to `AdapterError` subclasses
- [ ] Add `supports()` and `getCapabilities()` methods
- [ ] Ensure all Model methods match interface

### Phase 3: Update Drizzle Adapter (Days 7-10)

- [ ] Implement `isVersioningEnabled()` method
- [ ] Implement `createVersion()` method (delegate to HistoryService or stub)
- [ ] Update `native()` to return `NativeAccess<T>` type
- [ ] Use unified token generation
- [ ] Map PostgreSQL errors to `AdapterError` subclasses
- [ ] Add `supports()` and `getCapabilities()` methods
- [ ] Ensure all Model methods match interface

### Phase 4: Core Integration (Days 11-12)

- [ ] Update `DatabaseAdapterFactory` to validate adapter contract
- [ ] Add runtime contract validation in development mode
- [ ] Update content service to use unified types
- [ ] Update history service integration

### Phase 5: Testing & Documentation (Days 13-14)

- [ ] Create adapter compliance test suite
- [ ] Run compliance tests against Mongoose
- [ ] Run compliance tests against Drizzle
- [ ] Document adapter development guide
- [ ] Update existing documentation

---

## Adapter Compliance Test Suite

```typescript
// packages/common/src/testing/adapter-compliance.test.ts

export function testAdapterCompliance(adapter: DatabaseAdapter): void {
  describe(`${adapter.name} Adapter Compliance`, () => {
    // ============= Adapter Interface =============
    describe('DatabaseAdapter interface', () => {
      it('implements connect()', () => {
        expect(typeof adapter.connect).toBe('function')
      })

      it('implements forFeature()', () => {
        expect(typeof adapter.forFeature).toBe('function')
      })

      it('implements model()', () => {
        expect(typeof adapter.model).toBe('function')
      })

      it('implements token()', () => {
        expect(typeof adapter.token).toBe('function')
      })

      it('implements onModuleDestroy()', () => {
        expect(typeof adapter.onModuleDestroy).toBe('function')
      })

      it('implements supports()', () => {
        expect(typeof adapter.supports).toBe('function')
      })

      it('implements getCapabilities()', () => {
        expect(typeof adapter.getCapabilities).toBe('function')
      })
    })

    // ============= Model Interface =============
    describe('Model interface', () => {
      let model: Model<TestSchema>

      beforeAll(async () => {
        model = adapter.model<TestSchema>(testModelInstance)
      })

      it('implements create()', () => {
        expect(typeof model.create).toBe('function')
      })

      it('implements find()', () => {
        expect(typeof model.find).toBe('function')
      })

      it('implements findById()', () => {
        expect(typeof model.findById).toBe('function')
      })

      it('implements findOne()', () => {
        expect(typeof model.findOne).toBe('function')
      })

      it('implements findMany()', () => {
        expect(typeof model.findMany).toBe('function')
      })

      it('implements update()', () => {
        expect(typeof model.update).toBe('function')
      })

      it('implements delete()', () => {
        expect(typeof model.delete).toBe('function')
      })

      it('implements locale()', () => {
        expect(typeof model.locale).toBe('function')
      })

      it('implements getLocale()', () => {
        expect(typeof model.getLocale).toBe('function')
      })

      it('implements version()', () => {
        expect(typeof model.version).toBe('function')
      })

      it('implements isVersioningEnabled()', () => {
        expect(typeof model.isVersioningEnabled).toBe('function')
      })

      it('implements createVersion()', () => {
        expect(typeof model.createVersion).toBe('function')
      })

      it('implements findVersions()', () => {
        expect(typeof model.findVersions).toBe('function')
      })

      it('implements findVersionById()', () => {
        expect(typeof model.findVersionById).toBe('function')
      })

      it('implements restoreVersion()', () => {
        expect(typeof model.restoreVersion).toBe('function')
      })

      it('implements query()', () => {
        expect(typeof model.query).toBe('function')
      })

      it('implements native()', () => {
        expect(typeof model.native).toBe('function')
      })

      it('implements getSchemaName()', () => {
        expect(typeof model.getSchemaName).toBe('function')
      })

      it('implements getMetadata()', () => {
        expect(typeof model.getMetadata).toBe('function')
      })
    })

    // ============= QueryBuilder Interface =============
    describe('QueryBuilder interface', () => {
      let queryBuilder: QueryBuilder<TestSchema>

      beforeAll(() => {
        const model = adapter.model<TestSchema>(testModelInstance)
        queryBuilder = model.query()
      })

      it('implements where()', () => {
        expect(typeof queryBuilder.where).toBe('function')
      })

      it('implements and()', () => {
        expect(typeof queryBuilder.and).toBe('function')
      })

      it('implements or()', () => {
        expect(typeof queryBuilder.or).toBe('function')
      })

      it('implements sort()', () => {
        expect(typeof queryBuilder.sort).toBe('function')
      })

      it('implements limit()', () => {
        expect(typeof queryBuilder.limit).toBe('function')
      })

      it('implements skip()', () => {
        expect(typeof queryBuilder.skip).toBe('function')
      })

      it('implements paginate()', () => {
        expect(typeof queryBuilder.paginate).toBe('function')
      })

      it('implements select()', () => {
        expect(typeof queryBuilder.select).toBe('function')
      })

      it('implements locale()', () => {
        expect(typeof queryBuilder.locale).toBe('function')
      })

      it('implements exec()', () => {
        expect(typeof queryBuilder.exec).toBe('function')
      })

      it('implements execOne()', () => {
        expect(typeof queryBuilder.execOne).toBe('function')
      })

      it('implements count()', () => {
        expect(typeof queryBuilder.count).toBe('function')
      })

      it('implements exists()', () => {
        expect(typeof queryBuilder.exists).toBe('function')
      })
    })

    // ============= Error Handling =============
    describe('Error handling', () => {
      it('throws DocumentNotFoundError for missing documents', async () => {
        const model = adapter.model<TestSchema>(testModelInstance)
        try {
          await model.update({ id: 'nonexistent' }, { name: 'test' })
          fail('Expected error')
        } catch (error) {
          expect(error).toBeInstanceOf(DocumentNotFoundError)
        }
      })

      it('throws DuplicateKeyError for unique constraint violations', async () => {
        const model = adapter.model<TestSchema>(testModelInstance)
        await model.create({ email: 'test@example.com' })
        try {
          await model.create({ email: 'test@example.com' })
          fail('Expected error')
        } catch (error) {
          expect(error).toBeInstanceOf(DuplicateKeyError)
        }
      })
    })
  })
}
```

---

## File Changes Summary

### New Files

| Path | Description |
|------|-------------|
| `packages/common/src/types/adapter.types.ts` | Core adapter interface |
| `packages/common/src/model/model.interface.ts` | Model interface |
| `packages/common/src/model/query-builder.interface.ts` | Query builder interface |
| `packages/common/src/types/adapter-errors.types.ts` | Unified error types |
| `packages/common/src/testing/adapter-compliance.test.ts` | Compliance test suite |

### Modified Files

| Path | Changes |
|------|---------|
| `packages/common/src/utils/tokens.util.ts` | Unified token functions |
| `packages/common/src/index.ts` | Export new types |
| `packages/adapters/mongoose/src/mongoose.adapter.ts` | Implement contract |
| `packages/adapters/mongoose/src/mongoose.model.ts` | Add missing methods |
| `packages/adapters/drizzle/src/drizzle.adapter.ts` | Implement contract |
| `packages/adapters/drizzle/src/drizzle.model.ts` | Add missing methods |
| `packages/core/src/modules/database/database-adapter.factory.ts` | Validate contract |

---

## Success Criteria

1. **Contract compliance** - Both adapters pass compliance test suite
2. **API consistency** - All Model methods available on both adapters
3. **Error unification** - Both adapters throw same error types
4. **Token standardization** - Single `getModelToken()` function used everywhere
5. **Lifecycle management** - Both adapters clean up on destroy
6. **Type safety** - All interfaces properly typed (no `any`)
7. **Documentation** - Adapter development guide complete
8. **`bun run check-types` passes** with 0 errors

---

## Future Adapter Development

With this contract, new adapters can be developed by:

1. Implementing `DatabaseAdapter` interface
2. Implementing `Model<T>` interface
3. Implementing `QueryBuilder<T>` interface
4. Mapping native errors to `AdapterError` subclasses
5. Running compliance test suite

```typescript
// Example: Future Prisma adapter
import { DatabaseAdapter, Model, QueryBuilder } from '@magnet-cms/common'

export class PrismaAdapter implements DatabaseAdapter {
  readonly name = 'prisma' as const

  connect(options: MagnetModuleOptions): DynamicModule { ... }
  forFeature(schemas: Type[]): DynamicModule { ... }
  model<T>(instance: unknown): Model<T> { ... }
  token(schema: string): string { return getModelToken(schema) }
  onModuleDestroy(): Promise<void> { ... }
  supports(feature: AdapterFeature): boolean { ... }
  getCapabilities(): AdapterCapabilities { ... }
}
```

---

## Dependencies

- **Depends on:** Plan 000 (Type Safety Remediation)
- **Blocks:** Plan 011 (Database Migrations) - migrations use adapter contract
