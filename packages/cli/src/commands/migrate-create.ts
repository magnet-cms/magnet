import { MigrationGenerator } from '@magnet-cms/adapter-db-drizzle'

/**
 * Core logic for migrate:create — generate an empty migration template.
 * Separated from Commander glue for testability.
 */
export async function runMigrateCreate(
  name: string,
  directory: string,
): Promise<{ filename: string; path: string }> {
  const gen = new MigrationGenerator()
  const content = gen.generate(name, [], [], {})
  // Replace no-op up/down with TODO placeholders for empty templates
  const templateContent = content
    .replace(
      '\t\t// No changes',
      '\t\t// TODO: add your UP migration SQL here\n\t\t// Example: await db.execute(`ALTER TABLE "users" ADD COLUMN "email" text`)',
    )
    .replace(
      '\t\t// TODO: implement down migration',
      '\t\t// TODO: add your DOWN migration SQL here\n\t\t// Example: await db.execute(`ALTER TABLE "users" DROP COLUMN "email"`)',
    )
  return gen.writeMigrationFile(directory, name, templateContent)
}
