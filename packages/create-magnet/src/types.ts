export type DatabaseAdapter = 'mongoose' | 'drizzle-neon' | 'drizzle-supabase'

export type Plugin = 'content-builder' | 'seo'

export type StorageAdapter = 'local' | 's3' | 'r2' | 'supabase' | 'none'

export type VaultAdapter = 'db' | 'hashicorp' | 'supabase'

export type PackageManager = 'npm' | 'bun' | 'pnpm' | 'yarn'

export type SupabaseLocalMode = 'cli' | 'postgres'

export interface ProjectConfig {
	projectName: string
	projectPath: string
	database: DatabaseAdapter
	plugins: Plugin[]
	storage: StorageAdapter
	/** Vault adapter (default: 'db' — built-in encrypted DB storage) */
	vault: VaultAdapter
	packageManager: PackageManager
	includeExample: boolean
	/** Local dev mode for Supabase — only set when database is 'drizzle-supabase' */
	supabaseLocalMode?: SupabaseLocalMode
}

export interface GeneratedFile {
	path: string
	content: string
}
