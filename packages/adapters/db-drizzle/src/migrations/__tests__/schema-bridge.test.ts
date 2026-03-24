import type { DrizzleSnapshotJSON } from 'drizzle-kit/api'
import { describe, expect, it, vi } from 'vitest'
import * as schemaGenerator from '../../schema/schema.generator'
import { SchemaBridge, sanitizeExecutableMigrationSql } from '../schema-bridge'

function makeEmptySnapshot(): DrizzleSnapshotJSON {
	return {
		id: 'empty',
		prevId: '0000',
		version: '7',
		dialect: 'postgresql',
		tables: {},
		views: {},
		schemas: {},
		sequences: {},
		roles: {},
		policies: {},
		enums: {},
		_meta: { schemas: {}, tables: {}, columns: {} },
	} as unknown as DrizzleSnapshotJSON
}

describe('SchemaBridge', () => {
	it('collectSchemas() returns registered schemas as record', () => {
		const mockTable = { name: 'users' } as unknown as ReturnType<
			typeof import('drizzle-orm/pg-core').pgTable
		>
		const registryMap = new Map([
			['User', { table: mockTable, tableName: 'users' }],
		])

		const getRegistered = vi
			.spyOn(schemaGenerator, 'getRegisteredSchemas')
			.mockReturnValue(registryMap)

		const bridge = new SchemaBridge()
		const schemas = bridge.collectSchemas()

		expect(Object.keys(schemas)).toContain('users')
		expect(schemas.users).toBe(mockTable)

		getRegistered.mockRestore()
	})

	it('collectSchemas() returns empty object when no schemas registered', () => {
		const getRegistered = vi
			.spyOn(schemaGenerator, 'getRegisteredSchemas')
			.mockReturnValue(new Map())

		const bridge = new SchemaBridge()
		const schemas = bridge.collectSchemas()

		expect(Object.keys(schemas)).toHaveLength(0)

		getRegistered.mockRestore()
	})

	it('generateSnapshot() calls drizzle-kit API with schemas', async () => {
		const mockTable = { name: 'users' } as unknown as ReturnType<
			typeof import('drizzle-orm/pg-core').pgTable
		>
		const registryMap = new Map([
			['User', { table: mockTable, tableName: 'users' }],
		])
		vi.spyOn(schemaGenerator, 'getRegisteredSchemas').mockReturnValue(
			registryMap,
		)

		const mockSnapshot = makeEmptySnapshot()
		const mockGenerateJson = vi
			.spyOn(
				{ fn: async (_imports: Record<string, unknown>) => mockSnapshot },
				'fn',
			)
			.mockResolvedValue(mockSnapshot)

		const bridge = new SchemaBridge()
		const result = await bridge.generateSnapshot(
			'postgresql',
			async (imports) => {
				return mockGenerateJson(imports)
			},
		)

		expect(result).toBe(mockSnapshot)
	})

	it('generateSQL() returns empty array when no changes', async () => {
		const snapshot = makeEmptySnapshot()
		const bridge = new SchemaBridge()

		const sql = await bridge.generateSQL(
			snapshot,
			snapshot,
			async (prev, cur) => {
				expect(prev).toBe(snapshot)
				expect(cur).toBe(snapshot)
				return []
			},
		)

		expect(sql).toEqual([])
	})

	it('generateSQL() returns SQL statements', async () => {
		const prev = makeEmptySnapshot()
		const cur = makeEmptySnapshot()
		const bridge = new SchemaBridge()

		const sql = await bridge.generateSQL(prev, cur, async (_prev, _cur) => {
			return [
				'CREATE TABLE users (id TEXT PRIMARY KEY)',
				'CREATE INDEX ON users (id)',
			]
		})

		expect(sql).toHaveLength(2)
		expect(sql[0]).toContain('CREATE TABLE')
	})

	it('getRegisteredSchemas is exported from schema.generator', () => {
		expect(typeof schemaGenerator.getRegisteredSchemas).toBe('function')
	})

	it('sanitizeExecutableMigrationSql binds partial-index placeholders for PostgreSQL', () => {
		const raw =
			'CREATE UNIQUE INDEX "x" ON "cats" ("tag_id") WHERE ("cats"."locale" = $1 and "cats"."status" = $2);'
		const out = sanitizeExecutableMigrationSql('postgresql', raw)
		expect(out).toContain(`"locale" = 'en'`)
		expect(out).toContain(`"status" = 'draft'`)
		expect(out).not.toContain('$1')
	})
})
