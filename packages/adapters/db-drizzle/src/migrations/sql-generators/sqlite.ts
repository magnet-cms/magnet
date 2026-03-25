/**
 * SQLite-specific SQL generation helpers.
 * Primary SQL generation is handled by drizzle-kit's generateSQLiteMigration/generateSQLiteDrizzleJson.
 *
 * Note: SQLite has limited ALTER TABLE support — no DROP COLUMN or MODIFY COLUMN.
 * Complex schema changes require table recreation (rename old, create new, copy data, drop old).
 */

import type { ColumnDef, IndexDef } from './postgresql'

export type { ColumnDef, IndexDef }

/**
 * Generate CREATE TABLE SQL for SQLite
 */
export function createTable(tableName: string, columns: ColumnDef[]): string {
  const cols = columns
    .map((col) => {
      let def = `"${col.name}" ${col.type}`
      if (col.primaryKey) def += ' PRIMARY KEY'
      if (!col.nullable && !col.primaryKey) def += ' NOT NULL'
      if (col.default !== undefined) def += ` DEFAULT ${col.default}`
      return def
    })
    .join(',\n\t')
  return `CREATE TABLE "${tableName}" (\n\t${cols}\n)`
}

/**
 * Generate DROP TABLE SQL for SQLite
 */
export function dropTable(tableName: string): string {
  return `DROP TABLE "${tableName}"`
}

/**
 * Generate ADD COLUMN SQL for SQLite
 * Note: SQLite ADD COLUMN is limited — no NOT NULL without DEFAULT, no UNIQUE, no PRIMARY KEY
 */
export function addColumn(tableName: string, column: ColumnDef): string {
  let def = `"${column.name}" ${column.type}`
  if (column.default !== undefined) def += ` DEFAULT ${column.default}`
  return `ALTER TABLE "${tableName}" ADD COLUMN ${def}`
}

/**
 * Generate CREATE INDEX SQL for SQLite
 */
export function createIndex(idx: IndexDef): string {
  const unique = idx.unique ? 'UNIQUE ' : ''
  const cols = idx.columns.map((c) => `"${c}"`).join(', ')
  return `CREATE ${unique}INDEX "${idx.name}" ON "${idx.table}" (${cols})`
}

/**
 * Generate DROP INDEX SQL for SQLite
 */
export function dropIndex(indexName: string): string {
  return `DROP INDEX "${indexName}"`
}
