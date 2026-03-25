/**
 * PostgreSQL-specific SQL generation helpers.
 * Primary SQL generation is handled by drizzle-kit's generateMigration/generateDrizzleJson.
 * These helpers are for manual SQL generation when needed.
 */

export interface ColumnDef {
  name: string
  type: string
  nullable?: boolean
  default?: string
  primaryKey?: boolean
}

export interface IndexDef {
  name: string
  table: string
  columns: string[]
  unique?: boolean
}

/**
 * Generate CREATE TABLE SQL for PostgreSQL
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
 * Generate DROP TABLE SQL for PostgreSQL
 */
export function dropTable(tableName: string): string {
  return `DROP TABLE "${tableName}"`
}

/**
 * Generate ADD COLUMN SQL for PostgreSQL
 */
export function addColumn(tableName: string, column: ColumnDef): string {
  let def = `"${column.name}" ${column.type}`
  if (!column.nullable) def += ' NOT NULL'
  if (column.default !== undefined) def += ` DEFAULT ${column.default}`
  return `ALTER TABLE "${tableName}" ADD COLUMN ${def}`
}

/**
 * Generate DROP COLUMN SQL for PostgreSQL
 */
export function dropColumn(tableName: string, columnName: string): string {
  return `ALTER TABLE "${tableName}" DROP COLUMN "${columnName}"`
}

/**
 * Generate ALTER COLUMN TYPE SQL for PostgreSQL
 */
export function alterColumnType(tableName: string, columnName: string, newType: string): string {
  return `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE ${newType}`
}

/**
 * Generate CREATE INDEX SQL for PostgreSQL
 */
export function createIndex(idx: IndexDef): string {
  const unique = idx.unique ? 'UNIQUE ' : ''
  const cols = idx.columns.map((c) => `"${c}"`).join(', ')
  return `CREATE ${unique}INDEX "${idx.name}" ON "${idx.table}" (${cols})`
}

/**
 * Generate DROP INDEX SQL for PostgreSQL
 */
export function dropIndex(indexName: string): string {
  return `DROP INDEX "${indexName}"`
}
