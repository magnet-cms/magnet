import type { SchemaBridge, SnapshotJSON } from './schema-bridge'
import type { MigrationDialect } from './types'

/**
 * Dangerous SQL patterns that indicate data-loss operations
 */
const DANGEROUS_PATTERNS: Array<{
	pattern: RegExp
	message: (match: string) => string
}> = [
	{
		pattern: /DROP\s+TABLE\s+"?(\w+)"?/i,
		message: (m) =>
			`DROP TABLE "${m}" will permanently delete all data in this table`,
	},
	{
		pattern: /ALTER\s+TABLE\s+"?(\w+)"?\s+DROP\s+COLUMN\s+"?(\w+)"?/i,
		message: (m) => `DROP COLUMN in "${m}" will permanently delete column data`,
	},
	{
		pattern: /ALTER\s+TABLE\s+"?(\w+)"?\s+MODIFY\s+COLUMN/i,
		message: (m) => `MODIFY COLUMN in "${m}" may cause data truncation`,
	},
	{
		pattern: /ALTER\s+TABLE\s+"?(\w+)"?\s+ALTER\s+COLUMN\s+"?(\w+)"?\s+TYPE/i,
		message: (m) =>
			`Type change in "${m}" may cause data loss or conversion errors`,
	},
]

/**
 * Result of a schema diff operation
 */
export interface SchemaDiffResult {
	/** SQL statements for the up migration */
	upSQL: string[]
	/** Whether this diff contains dangerous operations */
	dangerous: boolean
	/** Warning messages for dangerous operations */
	warnings: string[]
	/** Whether there are no changes */
	isEmpty: boolean
	/** The current schema snapshot */
	currentSnapshot: SnapshotJSON
}

/**
 * Diffs the current decorator schemas against a previous snapshot
 * using drizzle-kit's programmatic API.
 */
export class SchemaDiff {
	constructor(private readonly bridge: SchemaBridge) {}

	/**
	 * Generate a diff between the previous snapshot and the current schema state.
	 *
	 * @param dialect - SQL dialect to use
	 * @param prevSnapshot - Previous snapshot (uses empty snapshot if not provided)
	 */
	async diff(
		dialect: MigrationDialect,
		prevSnapshot?: SnapshotJSON,
	): Promise<SchemaDiffResult> {
		const prev = prevSnapshot ?? this.bridge.emptySnapshot(dialect)
		const currentSnapshot = await this.bridge.generateSnapshot(dialect)
		const upSQL = await this.bridge.generateSQL(
			prev,
			currentSnapshot,
			undefined,
			dialect,
		)

		const { dangerous, warnings } = this.detectDangerousOperations(upSQL)

		return {
			upSQL,
			dangerous,
			warnings,
			isEmpty: upSQL.length === 0,
			currentSnapshot,
		}
	}

	/**
	 * Scan SQL statements for dangerous operations (drops, type changes).
	 */
	detectDangerousOperations(sqlStatements: string[]): {
		dangerous: boolean
		warnings: string[]
	} {
		const warnings: string[] = []

		for (const sql of sqlStatements) {
			for (const { pattern, message } of DANGEROUS_PATTERNS) {
				const match = sql.match(pattern)
				if (match) {
					warnings.push(message(match[1] ?? match[0]))
				}
			}
		}

		return { dangerous: warnings.length > 0, warnings }
	}
}
