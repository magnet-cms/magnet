import type { MigrationDb } from '@magnet-cms/adapter-db-drizzle'

/**
 * Create a minimal MigrationDb connection from a connection URL.
 * Uses the appropriate driver based on the URL scheme.
 */
export async function createConnection(
	databaseUrl: string,
): Promise<MigrationDb> {
	if (
		databaseUrl.startsWith('postgresql://') ||
		databaseUrl.startsWith('postgres://')
	) {
		return createPostgresConnection(databaseUrl)
	}

	if (databaseUrl.startsWith('mysql://')) {
		return createMysqlConnection(databaseUrl)
	}

	if (
		databaseUrl.startsWith('file:') ||
		databaseUrl.endsWith('.db') ||
		databaseUrl === ':memory:'
	) {
		return createSqliteConnection(databaseUrl)
	}

	throw new Error(
		`Unsupported database URL scheme: ${databaseUrl}. Supported: postgresql://, mysql://, file: (SQLite)`,
	)
}

async function createPostgresConnection(url: string): Promise<MigrationDb> {
	try {
		const { neon } = await import('@neondatabase/serverless')
		const sql = neon(url)
		return {
			async execute(query: string) {
				return sql.transaction([sql(query)])
			},
		}
	} catch {
		// Fall back to pg
		const { Client } = await import('pg')
		const client = new Client({ connectionString: url })
		await client.connect()
		return {
			async execute(query: string) {
				return client.query(query)
			},
		}
	}
}

async function createMysqlConnection(url: string): Promise<MigrationDb> {
	const { createConnection: mysqlConnect } = await import('mysql2/promise')
	const connection = await mysqlConnect(url)
	return {
		async execute(query: string, params?: unknown[]) {
			return connection.execute(query, params)
		},
	}
}

async function createSqliteConnection(path: string): Promise<MigrationDb> {
	const { default: Database } = await import('better-sqlite3')
	const db = new Database(path === 'file::memory:' ? ':memory:' : path)
	return {
		async execute(query: string) {
			return db.exec(query)
		},
	}
}
