# Plan 011: Database Migrations System

**Status:** Proposed
**Priority:** High
**Estimated Effort:** 3 weeks
**Depends on:** Plan 000 (Type Safety), Plan 000c (Unified Adapter Contract)

---

## Summary

Implement a robust database migrations system for Magnet CMS, primarily targeting the Drizzle adapter. The system will support both automatic (development) and manual (CLI-based) migration workflows, with migrations stored in a dedicated `migrations` folder alongside the existing `uploads` folder pattern.

---

## Problem Statement

### Current Behavior

The Drizzle adapter uses a "lazy auto-migration" approach:
```typescript
// packages/adapters/drizzle/src/drizzle.adapter.ts
private async ensureTablesCreated() {
  // Creates tables on first model access with CREATE TABLE IF NOT EXISTS
  await this.createTableFromConfig(schemaClass, table)
}
```

### Issues

1. **No migration history** - Schema changes aren't tracked or versioned
2. **Data loss risk** - Column removals/renames silently fail or destroy data
3. **No rollback capability** - Can't undo schema changes
4. **Production unsafe** - Auto-migration is risky for production databases
5. **No team synchronization** - Developers can't share schema changes reliably
6. **No CI/CD integration** - Can't validate migrations in pipelines

### Real-World Scenarios That Fail

```typescript
// Scenario 1: Rename column - loses all data
@Schema()
class Post {
  // @Field.Text() title: string     // OLD
  @Field.Text() headline: string     // NEW - data lost!
}

// Scenario 2: Change type - fails silently
@Schema()
class Product {
  // @Field.Text() price: string     // OLD
  @Field.Number() price: number      // NEW - type mismatch!
}

// Scenario 3: Add required column - breaks existing rows
@Schema()
class User {
  @Field.Text({ required: true })
  newRequiredField: string           // Existing rows have NULL!
}
```

---

## Proposed Solution

### Dual-Mode Migration System

| Mode | Environment | Behavior |
|------|-------------|----------|
| **Auto** | Development | Auto-generate and apply migrations |
| **Manual** | Production | Generate migration files, apply via CLI |

### Configuration

```typescript
// magnet.config.ts
export default {
  database: {
    adapter: DrizzleAdapter,
    config: {
      connectionString: process.env.DATABASE_URL,
      dialect: 'postgresql',
    },
    migrations: {
      mode: process.env.NODE_ENV === 'production' ? 'manual' : 'auto',
      directory: './migrations',    // Default migrations folder
      tableName: '_magnet_migrations',  // Migration history table
      lockTableName: '_magnet_migrations_lock',  // Prevent concurrent migrations
    },
  },
  storage: {
    adapter: 'local',
    config: {
      uploadDir: './uploads',       // Existing pattern
    },
  },
}
```

### Folder Structure

```
my-magnet-project/
├── migrations/                     # NEW: Migration files
│   ├── 0001_initial_schema.ts
│   ├── 0002_add_user_avatar.ts
│   └── 0003_rename_post_title.ts
├── uploads/                        # Existing: File storage
│   └── ...
├── src/
│   └── schemas/
│       ├── user.schema.ts
│       └── post.schema.ts
└── magnet.config.ts
```

---

## Architecture

### Migration File Format

```typescript
// migrations/0002_add_user_avatar.ts
import { Migration, sql } from '@magnet-cms/migrations'

export const migration: Migration = {
  id: '0002_add_user_avatar',
  timestamp: 1706180400000,

  async up(db) {
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN avatar TEXT
    `)
  },

  async down(db) {
    await db.execute(sql`
      ALTER TABLE users
      DROP COLUMN avatar
    `)
  },
}
```

### Auto-Generated Migrations

When `mode: 'auto'`, the system:
1. Compares current schema decorators to database state
2. Generates migration SQL for differences
3. Creates timestamped migration file
4. Applies migration automatically

```typescript
// Auto-generated migration example
// migrations/0003_20240125_143052_auto.ts
import { Migration, sql } from '@magnet-cms/migrations'

export const migration: Migration = {
  id: '0003_20240125_143052_auto',
  timestamp: 1706190652000,
  description: 'Auto-generated: Add headline column to posts',

  async up(db) {
    // Detected: New column 'headline' in Post schema
    await db.execute(sql`
      ALTER TABLE posts
      ADD COLUMN headline TEXT
    `)
  },

  async down(db) {
    await db.execute(sql`
      ALTER TABLE posts
      DROP COLUMN headline
    `)
  },
}
```

### Schema Diffing Engine

```
┌─────────────────────────────────────────────────────────────────┐
│                    Schema Diff Process                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │   Current    │         │   Database   │                     │
│  │   Schema     │         │   State      │                     │
│  │  Decorators  │         │  (Introspect)│                     │
│  └──────┬───────┘         └──────┬───────┘                     │
│         │                        │                              │
│         ▼                        ▼                              │
│  ┌──────────────────────────────────────────┐                  │
│  │           SchemaComparator               │                  │
│  │  - Extract table definitions             │                  │
│  │  - Compare columns, types, constraints   │                  │
│  │  - Detect additions, removals, changes   │                  │
│  └──────────────────┬───────────────────────┘                  │
│                     │                                           │
│                     ▼                                           │
│  ┌──────────────────────────────────────────┐                  │
│  │           DiffResult                     │                  │
│  │  - tablesToCreate: Table[]               │                  │
│  │  - tablesToDrop: string[]                │                  │
│  │  - columnsToAdd: ColumnChange[]          │                  │
│  │  - columnsToRemove: ColumnChange[]       │                  │
│  │  - columnsToAlter: ColumnChange[]        │                  │
│  │  - indexesToAdd: Index[]                 │                  │
│  │  - indexesToRemove: string[]             │                  │
│  └──────────────────┬───────────────────────┘                  │
│                     │                                           │
│                     ▼                                           │
│  ┌──────────────────────────────────────────┐                  │
│  │           MigrationGenerator             │                  │
│  │  - Generate SQL statements               │                  │
│  │  - Handle dialect differences            │                  │
│  │  - Create up/down functions              │                  │
│  └──────────────────────────────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Migration Runner

```
┌─────────────────────────────────────────────────────────────────┐
│                    Migration Runner                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Acquire Lock                                                │
│     └── INSERT INTO _magnet_migrations_lock (locked_at)         │
│                                                                 │
│  2. Load Migration History                                      │
│     └── SELECT * FROM _magnet_migrations ORDER BY timestamp     │
│                                                                 │
│  3. Discover Pending Migrations                                 │
│     └── Compare history to files in migrations/                 │
│                                                                 │
│  4. For Each Pending Migration (in order):                      │
│     ├── BEGIN TRANSACTION                                       │
│     ├── Execute migration.up(db)                                │
│     ├── INSERT INTO _magnet_migrations (id, name, timestamp)    │
│     ├── COMMIT                                                  │
│     └── Log success                                             │
│                                                                 │
│  5. Release Lock                                                │
│     └── DELETE FROM _magnet_migrations_lock                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## CLI Commands

### Package: `@magnet-cms/cli` (or extend `create-magnet`)

```bash
# Generate migration from schema changes
magnet migrate:generate [name]
# Example: magnet migrate:generate add-user-avatar
# Output: Created migrations/0004_add_user_avatar.ts

# Apply pending migrations
magnet migrate:up
# Output:
# ✓ Applied 0003_rename_post_title (23ms)
# ✓ Applied 0004_add_user_avatar (18ms)
# 2 migrations applied successfully

# Rollback last migration
magnet migrate:down
# Output: ✓ Rolled back 0004_add_user_avatar (15ms)

# Rollback to specific migration
magnet migrate:down --to 0002
# Output:
# ✓ Rolled back 0004_add_user_avatar (15ms)
# ✓ Rolled back 0003_rename_post_title (12ms)

# Show migration status
magnet migrate:status
# Output:
# ┌────┬──────────────────────────┬─────────────────────┬─────────┐
# │ #  │ Migration                │ Applied At          │ Status  │
# ├────┼──────────────────────────┼─────────────────────┼─────────┤
# │ 1  │ 0001_initial_schema      │ 2024-01-20 10:30:00 │ Applied │
# │ 2  │ 0002_add_user_avatar     │ 2024-01-22 14:15:00 │ Applied │
# │ 3  │ 0003_rename_post_title   │ -                   │ Pending │
# └────┴──────────────────────────┴─────────────────────┴─────────┘

# Reset database (dangerous!)
magnet migrate:reset
# Output: This will drop all tables. Are you sure? (y/N)

# Create empty migration
magnet migrate:create [name]
# Output: Created migrations/0005_custom_migration.ts (empty template)

# Show SQL without executing
magnet migrate:generate --dry-run
# Output: Shows SQL that would be generated

# Fresh migration from current state
magnet migrate:fresh
# Drops all tables and runs all migrations from scratch
```

### Programmatic API

```typescript
import { MigrationRunner } from '@magnet-cms/migrations'

const runner = new MigrationRunner({
  directory: './migrations',
  database: drizzleInstance,
})

// Apply all pending
await runner.up()

// Rollback last
await runner.down()

// Get status
const status = await runner.status()
// Returns: { applied: Migration[], pending: Migration[] }

// Generate from schema diff
const migration = await runner.generate('add-user-avatar')
// Returns: { path: string, sql: string }
```

---

## Database Schema Introspection

### PostgreSQL

```typescript
// Get current table structure
const columns = await db.execute(sql`
  SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = ${tableName}
`)

const indexes = await db.execute(sql`
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE tablename = ${tableName}
`)
```

### MySQL

```typescript
const columns = await db.execute(sql`
  DESCRIBE ${sql.identifier(tableName)}
`)

const indexes = await db.execute(sql`
  SHOW INDEX FROM ${sql.identifier(tableName)}
`)
```

### SQLite

```typescript
const columns = await db.execute(sql`
  PRAGMA table_info(${tableName})
`)

const indexes = await db.execute(sql`
  PRAGMA index_list(${tableName})
`)
```

---

## Dialect-Specific SQL Generation

### Column Type Mapping

| Magnet Type | PostgreSQL | MySQL | SQLite |
|-------------|------------|-------|--------|
| Text | `TEXT` | `TEXT` | `TEXT` |
| Number | `DOUBLE PRECISION` | `DOUBLE` | `REAL` |
| Integer | `INTEGER` | `INT` | `INTEGER` |
| Boolean | `BOOLEAN` | `TINYINT(1)` | `INTEGER` |
| Date | `TIMESTAMP` | `DATETIME` | `TEXT` |
| JSON | `JSONB` | `JSON` | `TEXT` |
| UUID | `UUID` | `CHAR(36)` | `TEXT` |

### Safe Operations

```typescript
// Add column (safe)
await db.execute(sql`
  ALTER TABLE ${table}
  ADD COLUMN ${column} ${type} ${nullable ? '' : 'NOT NULL'}
  ${defaultValue ? sql`DEFAULT ${defaultValue}` : ''}
`)

// Drop column (requires confirmation in manual mode)
await db.execute(sql`
  ALTER TABLE ${table}
  DROP COLUMN ${column}
`)

// Rename column (PostgreSQL)
await db.execute(sql`
  ALTER TABLE ${table}
  RENAME COLUMN ${oldName} TO ${newName}
`)
```

### Dangerous Operations Handling

When generating migrations, flag dangerous operations:

```typescript
export const migration: Migration = {
  id: '0005_remove_user_email',
  timestamp: 1706190652000,

  // Flag for CLI warning
  dangerous: true,
  warnings: [
    'This migration will DROP the email column',
    'All email data will be permanently lost',
  ],

  async up(db) {
    await db.execute(sql`
      ALTER TABLE users DROP COLUMN email
    `)
  },

  async down(db) {
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN email TEXT
    `)
    // Note: Data cannot be restored
  },
}
```

CLI output for dangerous migrations:
```
⚠️  Warning: Migration 0005_remove_user_email contains dangerous operations:
   • This migration will DROP the email column
   • All email data will be permanently lost

Do you want to proceed? (y/N)
```

---

## Implementation Phases

### Phase 1: Core Migration Infrastructure

- [ ] Create `packages/migrations/` package
- [ ] Define `Migration` interface and types
- [ ] Implement `MigrationRunner` class
- [ ] Implement `MigrationHistory` table management
- [ ] Implement migration locking mechanism
- [ ] Add transaction support for atomic migrations

### Phase 2: Schema Introspection

- [ ] Implement PostgreSQL introspector
- [ ] Implement MySQL introspector
- [ ] Implement SQLite introspector
- [ ] Create `DatabaseIntrospector` interface
- [ ] Extract table, column, index, and constraint info

### Phase 3: Schema Diffing

- [ ] Create `SchemaComparator` class
- [ ] Implement table comparison
- [ ] Implement column comparison (type, nullable, default)
- [ ] Implement index comparison
- [ ] Implement constraint comparison
- [ ] Generate `DiffResult` object

### Phase 4: Migration Generation

- [ ] Create `MigrationGenerator` class
- [ ] Implement SQL generation for each dialect
- [ ] Handle type mappings per dialect
- [ ] Generate up/down functions
- [ ] Write migration files to disk
- [ ] Add dangerous operation detection

### Phase 5: CLI Commands

- [ ] Add `migrate:generate` command
- [ ] Add `migrate:up` command
- [ ] Add `migrate:down` command
- [ ] Add `migrate:status` command
- [ ] Add `migrate:reset` command
- [ ] Add `migrate:create` command
- [ ] Add `--dry-run` flag support
- [ ] Add confirmation prompts for dangerous operations

### Phase 6: Auto-Migration Mode

- [ ] Integrate with Drizzle adapter startup
- [ ] Detect schema changes on boot
- [ ] Auto-generate and apply in development
- [ ] Skip auto-migration when `mode: 'manual'`
- [ ] Log auto-migration activity

### Phase 7: Integration & Testing

- [ ] Update `create-magnet` templates
- [ ] Add migrations folder to new projects
- [ ] Write unit tests for introspection
- [ ] Write unit tests for diff engine
- [ ] Write E2E tests for CLI commands
- [ ] Write E2E tests for auto-migration

### Phase 8: Documentation

- [ ] Document configuration options
- [ ] Document CLI commands
- [ ] Document migration file format
- [ ] Add migration best practices guide
- [ ] Add troubleshooting guide
- [ ] Document programmatic API

---

## File Changes

### New Package

```
packages/migrations/
├── src/
│   ├── index.ts
│   ├── types/
│   │   ├── migration.types.ts
│   │   ├── diff.types.ts
│   │   └── introspection.types.ts
│   ├── runner/
│   │   ├── migration-runner.ts
│   │   ├── migration-history.ts
│   │   └── migration-lock.ts
│   ├── introspection/
│   │   ├── introspector.interface.ts
│   │   ├── postgres.introspector.ts
│   │   ├── mysql.introspector.ts
│   │   └── sqlite.introspector.ts
│   ├── diff/
│   │   ├── schema-comparator.ts
│   │   └── diff-result.ts
│   ├── generator/
│   │   ├── migration-generator.ts
│   │   ├── sql-generator.ts
│   │   └── templates/
│   │       └── migration.template.ts
│   └── cli/
│       ├── commands/
│       │   ├── generate.ts
│       │   ├── up.ts
│       │   ├── down.ts
│       │   ├── status.ts
│       │   ├── reset.ts
│       │   └── create.ts
│       └── index.ts
├── package.json
└── tsconfig.json
```

### Modified Files

```
packages/adapters/drizzle/src/drizzle.adapter.ts
  - Integrate MigrationRunner
  - Check migration mode before auto-creating tables
  - Call migrations on connect()

packages/common/src/types/database.types.ts
  - Add MigrationConfig type
  - Add migrations option to DBConfig

packages/create-magnet/src/generators/
  - Add migrations folder to project template
  - Add migration config to magnet.config.ts template

packages/create-magnet/bin/create-magnet.js
  - Add migrate command aliases
```

---

## Configuration Types

```typescript
// packages/common/src/types/migration.types.ts

export interface MigrationConfig {
  /**
   * Migration mode:
   * - 'auto': Auto-generate and apply migrations (development)
   * - 'manual': Only apply migrations via CLI (production)
   * @default 'auto' in development, 'manual' in production
   */
  mode: 'auto' | 'manual'

  /**
   * Directory where migration files are stored
   * @default './migrations'
   */
  directory: string

  /**
   * Table name for tracking applied migrations
   * @default '_magnet_migrations'
   */
  tableName: string

  /**
   * Table name for migration lock
   * @default '_magnet_migrations_lock'
   */
  lockTableName: string

  /**
   * Timeout for acquiring migration lock (ms)
   * @default 30000
   */
  lockTimeout: number

  /**
   * Whether to run migrations in a transaction
   * @default true
   */
  transactional: boolean
}

export interface Migration {
  /** Unique identifier (usually filename without extension) */
  id: string

  /** Unix timestamp when migration was created */
  timestamp: number

  /** Human-readable description (optional) */
  description?: string

  /** Flag for dangerous operations */
  dangerous?: boolean

  /** Warning messages for dangerous operations */
  warnings?: string[]

  /** Apply the migration */
  up(db: DatabaseConnection): Promise<void>

  /** Revert the migration */
  down(db: DatabaseConnection): Promise<void>
}

export interface MigrationHistoryRecord {
  id: string
  name: string
  timestamp: number
  appliedAt: Date
  checksum: string
}
```

---

## Error Handling

### Migration Errors

```typescript
export class MigrationError extends Error {
  constructor(
    message: string,
    public readonly migrationId: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'MigrationError'
  }
}

export class MigrationLockError extends MigrationError {
  constructor(migrationId: string) {
    super(
      'Failed to acquire migration lock. Another migration may be in progress.',
      migrationId
    )
    this.name = 'MigrationLockError'
  }
}

export class MigrationChecksumError extends MigrationError {
  constructor(migrationId: string, expected: string, actual: string) {
    super(
      `Migration checksum mismatch for ${migrationId}. ` +
      `Expected ${expected}, got ${actual}. ` +
      'Migration file may have been modified after being applied.',
      migrationId
    )
    this.name = 'MigrationChecksumError'
  }
}
```

---

## Safety Features

### 1. Migration Locking

Prevents concurrent migrations in distributed environments:

```typescript
async acquireLock(): Promise<void> {
  const lockResult = await this.db.execute(sql`
    INSERT INTO ${this.lockTable} (locked_at, locked_by)
    SELECT NOW(), ${this.instanceId}
    WHERE NOT EXISTS (
      SELECT 1 FROM ${this.lockTable}
      WHERE locked_at > NOW() - INTERVAL '${this.lockTimeout} milliseconds'
    )
    RETURNING id
  `)

  if (lockResult.rowCount === 0) {
    throw new MigrationLockError()
  }
}
```

### 2. Checksum Validation

Detects if migration files were modified after being applied:

```typescript
function calculateChecksum(migration: Migration): string {
  const content = migration.up.toString() + migration.down.toString()
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16)
}
```

### 3. Dry Run Mode

Preview SQL without executing:

```bash
magnet migrate:generate --dry-run
# Output:
# -- Migration: 0004_add_user_avatar
# -- Up
# ALTER TABLE users ADD COLUMN avatar TEXT;
#
# -- Down
# ALTER TABLE users DROP COLUMN avatar;
```

### 4. Backup Reminder

Before dangerous migrations:

```
⚠️  Before proceeding, ensure you have a database backup!

Would you like to create a backup now?
  1. Create backup (pg_dump/mysqldump)
  2. I have a backup, continue
  3. Cancel
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('SchemaComparator', () => {
  it('detects new tables')
  it('detects dropped tables')
  it('detects new columns')
  it('detects dropped columns')
  it('detects column type changes')
  it('detects nullable changes')
  it('detects default value changes')
  it('detects new indexes')
  it('detects dropped indexes')
})

describe('MigrationGenerator', () => {
  it('generates valid up/down SQL')
  it('handles PostgreSQL dialect')
  it('handles MySQL dialect')
  it('handles SQLite dialect')
  it('flags dangerous operations')
})

describe('MigrationRunner', () => {
  it('applies pending migrations in order')
  it('rolls back migrations in reverse order')
  it('handles transaction failures')
  it('respects migration lock')
  it('validates checksums')
})
```

### E2E Tests

```typescript
describe('Migration CLI', () => {
  it('generates migration from schema change')
  it('applies migrations with migrate:up')
  it('rolls back with migrate:down')
  it('shows correct status')
  it('handles concurrent migration attempts')
})

describe('Auto Migration', () => {
  it('auto-generates migration in development')
  it('skips auto-migration in manual mode')
  it('applies migration on startup')
})
```

---

## Success Criteria

1. **CLI fully functional** - All migrate commands work reliably
2. **Multi-dialect support** - PostgreSQL, MySQL, SQLite all supported
3. **Auto-migration works** - Development workflow is seamless
4. **Production safe** - Manual mode prevents accidental changes
5. **Proper locking** - No concurrent migration issues
6. **Checksum validation** - Modified migrations are detected
7. **Comprehensive tests** - >90% coverage on core functionality
8. **Documentation complete** - All features documented with examples

---

## Future Enhancements

1. **Squash migrations** - Combine multiple migrations into one
2. **Seed data** - Support for seeding initial data
3. **Multi-tenant migrations** - Per-tenant schema migrations
4. **Migration branches** - Handle divergent migration histories
5. **GUI in admin** - Visual migration management in admin UI
6. **Cloud backup integration** - Auto-backup before migrations

---

## Dependencies

- **Depends on:** Plan 000 (Type Safety), Plan 000c (Unified Adapter Contract)
- **Blocks:** None (optional enhancement for SQL adapters)
