/**
 * MySQL-specific SQL generation helpers.
 * Primary SQL generation is handled by drizzle-kit's generateMySQLMigration/generateMySQLDrizzleJson.
 */

import type { ColumnDef, IndexDef } from './postgresql'

export type { ColumnDef, IndexDef }

/**
 * Generate CREATE TABLE SQL for MySQL
 */
export function createTable(tableName: string, columns: ColumnDef[]): string {
  const cols = columns
    .map((col) => {
      let def = `\`${col.name}\` ${col.type}`
      if (col.primaryKey) def += ' PRIMARY KEY'
      if (!col.nullable && !col.primaryKey) def += ' NOT NULL'
      if (col.default !== undefined) def += ` DEFAULT ${col.default}`
      return def
    })
    .join(',\n\t')
  return `CREATE TABLE \`${tableName}\` (\n\t${cols}\n)`
}

/**
 * Generate DROP TABLE SQL for MySQL
 */
export function dropTable(tableName: string): string {
  return `DROP TABLE \`${tableName}\``
}

/**
 * Generate ADD COLUMN SQL for MySQL
 */
export function addColumn(tableName: string, column: ColumnDef): string {
  let def = `\`${column.name}\` ${column.type}`
  if (!column.nullable) def += ' NOT NULL'
  if (column.default !== undefined) def += ` DEFAULT ${column.default}`
  return `ALTER TABLE \`${tableName}\` ADD COLUMN ${def}`
}

/**
 * Generate DROP COLUMN SQL for MySQL
 */
export function dropColumn(tableName: string, columnName: string): string {
  return `ALTER TABLE \`${tableName}\` DROP COLUMN \`${columnName}\``
}

/**
 * Generate MODIFY COLUMN SQL for MySQL (used for type changes)
 */
export function modifyColumn(tableName: string, column: ColumnDef): string {
  let def = `\`${column.name}\` ${column.type}`
  if (!column.nullable) def += ' NOT NULL'
  if (column.default !== undefined) def += ` DEFAULT ${column.default}`
  return `ALTER TABLE \`${tableName}\` MODIFY COLUMN ${def}`
}

/**
 * Generate CREATE INDEX SQL for MySQL
 */
export function createIndex(idx: IndexDef): string {
  const unique = idx.unique ? 'UNIQUE ' : ''
  const cols = idx.columns.map((c) => `\`${c}\``).join(', ')
  return `CREATE ${unique}INDEX \`${idx.name}\` ON \`${idx.table}\` (${cols})`
}

/**
 * Generate DROP INDEX SQL for MySQL
 */
export function dropIndex(indexName: string, tableName: string): string {
  return `DROP INDEX \`${indexName}\` ON \`${tableName}\``
}
