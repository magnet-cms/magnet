import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface MigrationGenerateOptions {
  dangerous?: boolean
  warnings?: string[]
}

/**
 * Generates TypeScript migration files from SQL statements.
 */
export class MigrationGenerator {
  /**
   * Generate the TypeScript content of a migration file.
   */
  generate(
    name: string,
    upSQL: string[],
    downSQL: string[],
    options: MigrationGenerateOptions = {},
  ): string {
    const timestamp = Date.now()
    const id = `${timestamp}_${name}`

    const upStatements = upSQL.map((sql) => `\t\tawait db.execute(\`${sql}\`)`).join('\n')
    const downStatements =
      downSQL.length > 0
        ? downSQL.map((sql) => `\t\tawait db.execute(\`${sql}\`)`).join('\n')
        : '\t\t// TODO: implement down migration'

    const dangerousField = options.dangerous ? '\n\tdangerous: true,' : ''
    const warningsField =
      options.warnings && options.warnings.length > 0
        ? `\n\twarnings: [\n${options.warnings.map((w) => `\t\t'${w.replace(/'/g, "\\'")}'`).join(',\n')}\n\t],`
        : ''

    return `import type { Migration, MigrationDb } from '@magnet-cms/adapter-db-drizzle'

export const migration: Migration = {
\tid: '${id}',
\ttimestamp: ${timestamp},${dangerousField}${warningsField}

\tasync up(db: MigrationDb): Promise<void> {
${upStatements || '\t\t// No changes'}
\t},

\tasync down(db: MigrationDb): Promise<void> {
${downStatements}
\t},
}
`
  }

  /**
   * Determine the next sequential migration number for a directory.
   * Returns 1 if the directory is empty, otherwise the highest number + 1.
   */
  async nextMigrationNumber(directory: string): Promise<number> {
    let files: string[] = []
    try {
      files = await readdir(directory)
    } catch {
      return 1
    }

    const migrationFiles = files.filter((f) => /^\d{4}_/.test(f))
    if (migrationFiles.length === 0) return 1

    const numbers = migrationFiles.map((f) => Number.parseInt(f.slice(0, 4), 10))
    return Math.max(...numbers) + 1
  }

  /**
   * Write a migration file to the directory with sequential numbering.
   */
  async writeMigrationFile(
    directory: string,
    name: string,
    content: string,
  ): Promise<{ filename: string; path: string }> {
    await mkdir(directory, { recursive: true })
    const num = await this.nextMigrationNumber(directory)
    const padded = String(num).padStart(4, '0')
    const filename = `${padded}_${name}.ts`
    const filePath = join(directory, filename)
    await writeFile(filePath, content, 'utf-8')
    return { filename, path: filePath }
  }
}
