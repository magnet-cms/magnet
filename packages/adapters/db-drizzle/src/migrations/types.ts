/**
 * Supported SQL dialects for migrations
 */
export type MigrationDialect = 'postgresql' | 'mysql' | 'sqlite'

/**
 * Migration mode:
 * - 'auto': Auto-generate and apply migrations on startup (development)
 * - 'manual': Only apply migrations via CLI (production)
 */
export type MigrationMode = 'auto' | 'manual'

/**
 * Configuration for the migration system
 */
export interface MigrationConfig {
  /**
   * Migration mode — 'auto' for development, 'manual' for production
   * @default 'auto'
   */
  mode: MigrationMode

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
   * Whether to run each migration in a transaction
   * @default true
   */
  transactional: boolean
}

/**
 * Default migration configuration
 */
export const DEFAULT_MIGRATION_CONFIG: MigrationConfig = {
  mode: 'auto',
  directory: './migrations',
  tableName: '_magnet_migrations',
  lockTableName: '_magnet_migrations_lock',
  lockTimeout: 30000,
  transactional: true,
}

/**
 * A database connection used to execute migration SQL.
 * Accept any object with an execute method for maximum compatibility.
 */
export interface MigrationDb {
  execute(sql: string, params?: unknown[]): Promise<unknown>
}

/**
 * A single migration with up and down functions
 */
export interface Migration {
  /** Unique identifier (usually filename without extension) */
  id: string

  /** Unix timestamp when migration was created */
  timestamp: number

  /** Human-readable description */
  description?: string

  /** Flag for dangerous operations (drops, type changes) */
  dangerous?: boolean

  /** Warning messages for dangerous operations */
  warnings?: string[]

  /** Apply the migration */
  up(db: MigrationDb): Promise<void>

  /** Revert the migration */
  down(db: MigrationDb): Promise<void>
}

/**
 * Record of an applied migration stored in the history table
 */
export interface MigrationHistoryRecord {
  /** Migration ID */
  id: string

  /** Migration name (same as id) */
  name: string

  /** Unix timestamp when migration was created */
  timestamp: number

  /** When this migration was applied */
  appliedAt: Date

  /** Checksum of the migration functions at time of application */
  checksum: string
}

/**
 * Column change descriptor for diffing
 */
export interface ColumnChange {
  /** Table name */
  table: string

  /** Column name */
  column: string

  /** SQL type */
  type?: string

  /** Whether column is nullable */
  nullable?: boolean

  /** Default value */
  default?: string

  /** Old column name (for renames) */
  oldColumn?: string

  /** Old type (for type changes) */
  oldType?: string
}

/**
 * Index descriptor for diffing
 */
export interface IndexChange {
  /** Index name */
  name: string

  /** Table name */
  table: string

  /** Column names */
  columns: string[]

  /** Whether unique */
  unique?: boolean
}

/**
 * Result of comparing decorator schemas against database state
 */
export interface DiffResult {
  /** Tables to create */
  tablesToCreate: TableDefinition[]

  /** Table names to drop */
  tablesToDrop: string[]

  /** Columns to add */
  columnsToAdd: ColumnChange[]

  /** Columns to remove */
  columnsToRemove: ColumnChange[]

  /** Columns to alter (type/nullable/default changes) */
  columnsToAlter: ColumnChange[]

  /** Indexes to add */
  indexesToAdd: IndexChange[]

  /** Index names to remove */
  indexesToRemove: string[]

  /** Whether there are no changes */
  isEmpty: boolean
}

/**
 * Full table definition for CREATE TABLE
 */
export interface TableDefinition {
  /** Table name */
  name: string

  /** Column definitions */
  columns: ColumnChange[]

  /** Index definitions */
  indexes: IndexChange[]
}

/**
 * Result of running migrations
 */
export interface MigrationResult {
  /** Number of migrations applied */
  applied: number

  /** Names of applied migrations */
  names: string[]

  /** Time taken per migration in ms */
  timings: Record<string, number>
}

/**
 * Base migration error
 */
export class MigrationError extends Error {
  constructor(
    message: string,
    public readonly migrationId: string,
    public override readonly cause?: Error,
  ) {
    super(message)
    this.name = 'MigrationError'
  }
}

/**
 * Thrown when the migration lock cannot be acquired
 */
export class MigrationLockError extends MigrationError {
  constructor(migrationId = 'unknown') {
    super('Failed to acquire migration lock. Another migration may be in progress.', migrationId)
    this.name = 'MigrationLockError'
  }
}

/**
 * Thrown when a migration file's checksum differs from what was recorded
 */
export class MigrationChecksumError extends MigrationError {
  constructor(migrationId: string, expected: string, actual: string) {
    super(
      `Migration checksum mismatch for ${migrationId}. Expected ${expected}, got ${actual}. Migration file may have been modified after being applied.`,
      migrationId,
    )
    this.name = 'MigrationChecksumError'
  }
}
