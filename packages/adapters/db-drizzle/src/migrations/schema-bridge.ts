import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { getRegisteredSchemas } from '../schema/schema.generator'

import type { MigrationDialect } from './types'

/**
 * drizzle-kit emits partial unique-index WHERE clauses with `$1`/`$2` placeholders,
 * but Magnet runs DDL as plain strings without bound parameters.
 */
export function sanitizeExecutableMigrationSql(
  dialect: MigrationDialect,
  statement: string,
): string {
  if (dialect !== 'postgresql') return statement
  if (!statement.includes('$')) return statement
  return statement
    .replace(/"locale" = \$1/g, `"locale" = 'en'`)
    .replace(/"status" = \$2/g, `"status" = 'draft'`)
}

/**
 * Default filename for persisted schema snapshot (used by auto-migration).
 */
export const SNAPSHOT_FILENAME = '.schema_snapshot.json'

/**
 * A drizzle snapshot JSON (opaque to us — owned by drizzle-kit)
 */

export type SnapshotJSON = Record<string, unknown> & {
  id: string
  prevId: string
  dialect: string
}

/**
 * Function signature for drizzle-kit's programmatic generateDrizzleJson / generateSQLiteDrizzleJson / generateMySQLDrizzleJson
 */
export type GenerateJsonFn = (
  imports: Record<string, unknown>,
  prevId?: string,
) => Promise<SnapshotJSON>

/**
 * Function signature for drizzle-kit's programmatic generateMigration / generateSQLiteMigration / generateMySQLMigration
 */
export type GenerateSQLFn = (prev: SnapshotJSON, cur: SnapshotJSON) => Promise<string[]>

/**
 * Bridges Magnet's decorator-generated Drizzle schemas to drizzle-kit's
 * programmatic API for schema snapshotting and SQL diff generation.
 */
export class SchemaBridge {
  /**
   * Collect all registered schemas from the schema registry into a plain record
   * suitable for passing to drizzle-kit's `generateDrizzleJson`.
   */
  collectSchemas(): Record<string, unknown> {
    const registry = getRegisteredSchemas()
    const imports: Record<string, unknown> = {}
    for (const [, { table, tableName }] of registry) {
      imports[tableName] = table
    }
    return imports
  }

  /**
   * Generate a drizzle-kit snapshot for the current schemas.
   *
   * @param dialect - SQL dialect to use
   * @param generateJsonFn - drizzle-kit's programmatic generateDrizzleJson function
   *   (injected for testability; defaults to importing from drizzle-kit/api at runtime)
   */
  async generateSnapshot(
    dialect: MigrationDialect,
    generateJsonFn?: GenerateJsonFn,
  ): Promise<SnapshotJSON> {
    const schemas = this.collectSchemas()
    const fn = generateJsonFn ?? (await this.resolveGenerateJsonFn(dialect))
    return fn(schemas)
  }

  /**
   * Generate SQL statements to migrate from `prev` snapshot to `cur` snapshot.
   *
   * @param prev - Previous snapshot (empty for first migration)
   * @param cur - Current snapshot
   * @param generateSQLFn - drizzle-kit's programmatic generateMigration function
   *   (injected for testability; defaults to importing from drizzle-kit/api at runtime)
   */
  async generateSQL(
    prev: SnapshotJSON,
    cur: SnapshotJSON,
    generateSQLFn?: GenerateSQLFn,
    dialect: MigrationDialect = 'postgresql',
  ): Promise<string[]> {
    const fn = generateSQLFn ?? (await this.resolveGenerateSQLFn(dialect))
    const statements = await fn(prev, cur)
    return statements.map((s) => sanitizeExecutableMigrationSql(dialect, s))
  }

  /**
   * Load a previously saved snapshot from disk.
   * Returns null if the file does not exist or is invalid.
   */
  async loadSnapshot(directory: string): Promise<SnapshotJSON | null> {
    const path = join(directory, SNAPSHOT_FILENAME)
    try {
      const content = await readFile(path, 'utf-8')
      const parsed = JSON.parse(content) as SnapshotJSON
      if (parsed && typeof parsed === 'object' && 'tables' in parsed) {
        return parsed
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * Save a snapshot to disk for use as prevSnapshot on the next run.
   */
  async saveSnapshot(directory: string, snapshot: SnapshotJSON): Promise<void> {
    await mkdir(directory, { recursive: true })
    const path = join(directory, SNAPSHOT_FILENAME)
    await writeFile(path, JSON.stringify(snapshot, null, 0), 'utf-8')
  }

  /**
   * Generate an empty snapshot to use as the "previous" state for the first migration.
   */
  emptySnapshot(dialect: MigrationDialect): SnapshotJSON {
    return {
      id: '0000000000000000',
      prevId: '0000000000000000',
      version: '7',
      dialect,
      tables: {},
      views: {},
      schemas: {},
      sequences: {},
      roles: {},
      policies: {},
      enums: {},
      _meta: { schemas: {}, tables: {}, columns: {} },
    }
  }

  private async resolveGenerateJsonFn(dialect: MigrationDialect): Promise<GenerateJsonFn> {
    if (dialect === 'sqlite') {
      const { generateSQLiteDrizzleJson } = await import('drizzle-kit/api')
      return generateSQLiteDrizzleJson as unknown as GenerateJsonFn
    }
    if (dialect === 'mysql') {
      const { generateMySQLDrizzleJson } = await import('drizzle-kit/api')
      return generateMySQLDrizzleJson as unknown as GenerateJsonFn
    }
    // postgresql (default)
    const { generateDrizzleJson } = await import('drizzle-kit/api')
    return ((imports: Record<string, unknown>, prevId?: string) =>
      Promise.resolve(generateDrizzleJson(imports, prevId))) as GenerateJsonFn
  }

  private async resolveGenerateSQLFn(dialect: MigrationDialect): Promise<GenerateSQLFn> {
    if (dialect === 'sqlite') {
      const { generateSQLiteMigration } = await import('drizzle-kit/api')
      return generateSQLiteMigration as unknown as GenerateSQLFn
    }
    if (dialect === 'mysql') {
      const { generateMySQLMigration } = await import('drizzle-kit/api')
      return generateMySQLMigration as unknown as GenerateSQLFn
    }
    const { generateMigration } = await import('drizzle-kit/api')
    return generateMigration as unknown as GenerateSQLFn
  }
}
