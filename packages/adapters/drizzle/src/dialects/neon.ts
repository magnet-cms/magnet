import type { DrizzleConfig } from '../types'

/**
 * Create a Neon serverless database connection.
 * Uses @neondatabase/serverless for edge/serverless deployments.
 *
 * @example
 * ```typescript
 * const db = await createNeonConnection({
 *   connectionString: process.env.DATABASE_URL,
 *   dialect: 'postgresql',
 *   driver: 'neon',
 * })
 * ```
 */
export async function createNeonConnection(config: DrizzleConfig) {
	// Dynamic imports for optional Neon dependency
	let neon: any
	let drizzleNeon: any

	try {
		neon = await import('@neondatabase/serverless')
		drizzleNeon = await import('drizzle-orm/neon-http')
	} catch {
		throw new Error(
			'@neondatabase/serverless is required for Neon driver. Install it with: bun add @neondatabase/serverless',
		)
	}

	const sql = neon.neon(config.connectionString)
	const db = drizzleNeon.drizzle(sql, {
		logger: config.debug,
	})

	return { db, pool: null }
}

/**
 * Create a Neon WebSocket connection for pooled/session mode.
 * Better for long-running processes with connection pooling.
 */
export async function createNeonWebSocketConnection(config: DrizzleConfig) {
	let neon: any
	let drizzleNeonWs: any

	try {
		neon = await import('@neondatabase/serverless')
		drizzleNeonWs = await import('drizzle-orm/neon-serverless')
	} catch {
		throw new Error(
			'@neondatabase/serverless is required for Neon driver. Install it with: bun add @neondatabase/serverless',
		)
	}

	const pool = new neon.Pool({ connectionString: config.connectionString })
	const db = drizzleNeonWs.drizzle(pool, {
		logger: config.debug,
	})

	return { db, pool }
}
