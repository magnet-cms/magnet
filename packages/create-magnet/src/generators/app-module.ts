import type { ProjectConfig } from '../types.js'

export function generateAppModule(config: ProjectConfig): string {
	const { plugins, includeExample } = config

	const imports: string[] = []
	const moduleImports: string[] = []

	// Database adapter import
	imports.push(...getDatabaseImports(config))

	// Storage adapter import
	imports.push(...getStorageImports(config))

	// Auth adapter import
	imports.push(...getAuthImports(config))

	// Vault adapter import
	imports.push(...getVaultImports(config))

	imports.push("import { MagnetModule } from '@magnet-cms/core'")

	// Plugin imports
	if (plugins.includes('playground')) {
		imports.push(
			"import { PlaygroundPlugin } from '@magnet-cms/plugin-playground'",
		)
	}
	if (plugins.includes('seo')) {
		imports.push("import { SeoPlugin } from '@magnet-cms/plugin-seo'")
	}
	if (plugins.includes('sentry')) {
		imports.push("import { SentryPlugin } from '@magnet-cms/plugin-sentry'")
	}

	imports.push("import { Module } from '@nestjs/common'")
	imports.push("import { ConfigModule } from '@nestjs/config'")

	// Example module import
	if (includeExample) {
		imports.push("import { ItemsModule } from './modules/items/items.module'")
		moduleImports.push('ItemsModule')
	}

	// Generate providers array and global options
	const providers = generateProviders(config)
	const globalOptions = generateGlobalOptions(config)

	// Build the file content
	let content = imports.join('\n')
	content += `

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		MagnetModule.forRoot([
${providers}
		]${globalOptions}),${moduleImports.length > 0 ? `\n\t\t${moduleImports.join(',\n\t\t')},` : ''}
	],
})
export class AppModule {}
`

	return content
}

function getDatabaseImports(config: ProjectConfig): string[] {
	if (config.database === 'mongoose') {
		return [
			"import { MongooseDatabaseAdapter } from '@magnet-cms/adapter-db-mongoose'",
		]
	}
	return [
		"import { DrizzleDatabaseAdapter } from '@magnet-cms/adapter-db-drizzle'",
	]
}

function getStorageImports(config: ProjectConfig): string[] {
	switch (config.storage) {
		case 's3':
			return [
				"import { S3StorageAdapter } from '@magnet-cms/adapter-storage-s3'",
			]
		case 'r2':
			return [
				"import { R2StorageAdapter } from '@magnet-cms/adapter-storage-r2'",
			]
		case 'supabase':
			return [
				"import { SupabaseStorageAdapter } from '@magnet-cms/adapter-storage-supabase'",
			]
		default:
			return []
	}
}

function getAuthImports(config: ProjectConfig): string[] {
	if (config.database === 'drizzle-supabase') {
		return [
			"import { SupabaseAuthAdapter } from '@magnet-cms/adapter-auth-supabase'",
		]
	}
	return []
}

function getVaultImports(config: ProjectConfig): string[] {
	if (config.database === 'drizzle-supabase') {
		return [
			"import { SupabaseVaultAdapter } from '@magnet-cms/adapter-vault-supabase'",
		]
	}
	return []
}

function generateProviders(config: ProjectConfig): string {
	const { database, plugins, storage } = config
	const lines: string[] = []

	// Database provider
	if (database === 'mongoose') {
		lines.push('\t\t\tMongooseDatabaseAdapter.forRoot(),')
	} else if (database === 'drizzle-neon') {
		lines.push('\t\t\tDrizzleDatabaseAdapter.forRoot({')
		lines.push(`\t\t\t\tdialect: 'postgresql',`)
		lines.push(`\t\t\t\tdriver: 'neon',`)
		lines.push('\t\t\t\tmigrations: {')
		lines.push(
			`\t\t\t\t\tmode: process.env.NODE_ENV === 'production' ? 'manual' : 'auto',`,
		)
		lines.push(`\t\t\t\t\tdirectory: './migrations',`)
		lines.push('\t\t\t\t},')
		lines.push('\t\t\t}),')
	} else if (database === 'drizzle-supabase') {
		lines.push('\t\t\tDrizzleDatabaseAdapter.forRoot({')
		lines.push(`\t\t\t\tdialect: 'postgresql',`)
		lines.push(`\t\t\t\tdriver: 'pg',`)
		lines.push('\t\t\t\tmigrations: {')
		lines.push(
			`\t\t\t\t\tmode: process.env.NODE_ENV === 'production' ? 'manual' : 'auto',`,
		)
		lines.push(`\t\t\t\t\tdirectory: './migrations',`)
		lines.push('\t\t\t\t},')
		lines.push('\t\t\t}),')
	}

	// Auth provider (Supabase)
	if (database === 'drizzle-supabase') {
		lines.push('\t\t\tSupabaseAuthAdapter.forRoot(),')
	}

	// Storage provider
	if (storage === 's3') {
		lines.push('\t\t\tS3StorageAdapter.forRoot(),')
	} else if (storage === 'r2') {
		lines.push('\t\t\tR2StorageAdapter.forRoot(),')
	} else if (storage === 'supabase') {
		lines.push('\t\t\tSupabaseStorageAdapter.forRoot(),')
	}

	// Vault provider (Supabase)
	if (database === 'drizzle-supabase') {
		lines.push('\t\t\tSupabaseVaultAdapter.forRoot(),')
	}

	// Plugin providers
	for (const plugin of plugins) {
		if (plugin === 'playground') {
			lines.push('\t\t\tPlaygroundPlugin.forRoot(),')
		} else if (plugin === 'seo') {
			lines.push('\t\t\tSeoPlugin.forRoot(),')
		} else if (plugin === 'sentry') {
			lines.push('\t\t\tSentryPlugin.forRoot(),')
		}
	}

	return lines.join('\n')
}

function generateGlobalOptions(config: ProjectConfig): string {
	return ', { admin: true }'
}
