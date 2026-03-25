import * as path from 'node:path'

import { checkbox, confirm, input, select } from '@inquirer/prompts'

import type {
  DatabaseAdapter,
  PackageManager,
  Plugin,
  ProjectConfig,
  StorageAdapter,
  SupabaseLocalMode,
  VaultAdapter,
} from './types.js'
import { detectPackageManager, directoryExists, isPackageManagerAvailable } from './utils/index.js'

interface CliOptions {
  database?: DatabaseAdapter
  install?: boolean
  example?: boolean
}

export async function collectConfig(
  projectNameArg: string | undefined,
  options: CliOptions,
): Promise<ProjectConfig> {
  // Project name
  const projectName = projectNameArg ?? (await promptProjectName())
  const projectPath = path.resolve(process.cwd(), projectName)

  // Database adapter
  const database = options.database ?? (await promptDatabaseAdapter())

  // Supabase local dev mode (only for drizzle-supabase)
  const supabaseLocalMode =
    database === 'drizzle-supabase' ? await promptSupabaseLocalMode() : undefined

  // Plugins
  const plugins = await promptPlugins()

  // Storage adapter
  const storage = await promptStorageAdapter(database)

  // Vault adapter
  const vault = await promptVaultAdapter()

  // Include example
  const includeExample = options.example ?? (await promptIncludeExample())

  // Package manager
  const packageManager = await promptPackageManager()

  return {
    projectName,
    projectPath,
    database,
    plugins,
    storage,
    vault,
    packageManager,
    includeExample,
    supabaseLocalMode,
  }
}

async function promptProjectName(): Promise<string> {
  return input({
    message: 'Project name:',
    default: 'my-magnet-app',
    validate: (value) => {
      const trimmed = value.trim()
      if (!trimmed) {
        return 'Project name is required'
      }
      if (!/^[a-z0-9-_]+$/i.test(trimmed)) {
        return 'Project name can only contain letters, numbers, hyphens, and underscores'
      }
      if (directoryExists(trimmed)) {
        return `Directory "${trimmed}" already exists`
      }
      return true
    },
  })
}

async function promptDatabaseAdapter(): Promise<DatabaseAdapter> {
  return select({
    message: 'Select database adapter:',
    choices: [
      {
        name: 'Mongoose (MongoDB)',
        value: 'mongoose' as const,
        description: 'Uses MongoDB with Mongoose ODM - great for flexible schemas',
      },
      {
        name: 'Drizzle + Neon (PostgreSQL)',
        value: 'drizzle-neon' as const,
        description: 'Uses Neon serverless PostgreSQL with Drizzle ORM',
      },
      {
        name: 'Drizzle + Supabase (PostgreSQL)',
        value: 'drizzle-supabase' as const,
        description: 'Uses Supabase PostgreSQL with Drizzle ORM and Supabase Auth',
      },
    ],
  })
}

async function promptPlugins(): Promise<Plugin[]> {
  return checkbox({
    message: 'Select plugins to include:',
    choices: [
      {
        name: 'Playground',
        value: 'playground' as const,
        checked: true,
      },
      {
        name: 'SEO',
        value: 'seo' as const,
        checked: false,
      },
      {
        name: 'Sentry (Error Tracking & Performance)',
        value: 'sentry' as const,
        checked: false,
      },
    ],
  })
}

async function promptStorageAdapter(database: DatabaseAdapter): Promise<StorageAdapter> {
  const defaultValue = database === 'drizzle-supabase' ? 'supabase' : 'local'

  return select({
    message: 'Select storage adapter:',
    default: defaultValue,
    choices: [
      {
        name: 'Local (file system)',
        value: 'local' as const,
        description: 'Store files on the local file system',
      },
      {
        name: 'AWS S3',
        value: 's3' as const,
        description: 'Store files in Amazon S3',
      },
      {
        name: 'Cloudflare R2',
        value: 'r2' as const,
        description: 'Store files in Cloudflare R2',
      },
      {
        name: 'Supabase Storage',
        value: 'supabase' as const,
        description: 'Store files in Supabase Storage',
      },
      {
        name: 'None (skip storage setup)',
        value: 'none' as const,
        description: 'Configure storage later',
      },
    ],
  })
}

async function promptVaultAdapter(): Promise<VaultAdapter> {
  return select({
    message: 'Select vault adapter for encrypted secrets:',
    default: 'db',
    choices: [
      {
        name: 'Database (built-in)',
        value: 'db' as const,
        description:
          'Store encrypted secrets in your app database using AES-256-GCM (requires VAULT_MASTER_KEY env var)',
      },
      {
        name: 'HashiCorp Vault',
        value: 'hashicorp' as const,
        description: 'Use HashiCorp Vault for secrets management (requires running Vault server)',
      },
      {
        name: 'Supabase Vault',
        value: 'supabase' as const,
        description: 'Use Supabase native Vault extension for secrets management',
      },
    ],
  })
}

async function promptIncludeExample(): Promise<boolean> {
  return confirm({
    message: 'Include example module?',
    default: true,
  })
}

async function promptSupabaseLocalMode(): Promise<SupabaseLocalMode> {
  return select({
    message: 'Select local development setup for Supabase:',
    default: 'postgres',
    choices: [
      {
        name: 'Raw PostgreSQL (Docker)',
        value: 'postgres' as const,
        description:
          'Run a local PostgreSQL container via Docker Compose — simple, no extra CLI needed',
      },
      {
        name: 'Supabase CLI',
        value: 'cli' as const,
        description:
          'Use the Supabase CLI (supabase start) for a full local Supabase stack with Auth, Storage, and Edge Functions',
      },
    ],
  })
}

async function promptPackageManager(): Promise<PackageManager> {
  const detected = detectPackageManager()
  const available: PackageManager[] = ['npm', 'bun', 'pnpm', 'yarn'].filter((pm) =>
    isPackageManagerAvailable(pm as PackageManager),
  ) as PackageManager[]

  // If detected is available, use it as default
  const defaultPm = available.includes(detected) ? detected : (available[0] ?? 'npm')

  return select({
    message: 'Select package manager:',
    default: defaultPm,
    choices: available.map((pm) => ({
      name: pm === detected ? `${pm} (detected)` : pm,
      value: pm,
    })),
  })
}
