import type {
  MigrationGenerator,
  SchemaDiff,
  MigrationDialect,
} from '@magnet-cms/adapter-db-drizzle'

export interface GenerateOptions {
  dryRun: boolean
  dialect: MigrationDialect
  prevSnapshotPath?: string
}

export interface GenerateResult {
  isEmpty: boolean
  dangerous: boolean
  warnings: string[]
  content?: string
  filename?: string
  path?: string
}

/**
 * Core logic for migrate:generate — diff schemas and produce a migration file.
 * Separated from Commander glue for testability.
 */
export async function runMigrateGenerate(
  diff: SchemaDiff,
  gen: MigrationGenerator,
  name: string,
  directory: string,
  options: GenerateOptions,
): Promise<GenerateResult> {
  const result = await diff.diff(options.dialect)

  if (result.isEmpty) {
    return { isEmpty: true, dangerous: false, warnings: [] }
  }

  const content = gen.generate(name, result.upSQL, [], {
    dangerous: result.dangerous,
    warnings: result.warnings,
  })

  if (options.dryRun) {
    return {
      isEmpty: false,
      dangerous: result.dangerous,
      warnings: result.warnings,
      content,
    }
  }

  const written = await gen.writeMigrationFile(directory, name, content)
  return {
    isEmpty: false,
    dangerous: result.dangerous,
    warnings: result.warnings,
    content,
    filename: written.filename,
    path: written.path,
  }
}
