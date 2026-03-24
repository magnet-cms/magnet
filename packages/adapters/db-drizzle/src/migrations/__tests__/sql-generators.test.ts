import { describe, expect, it } from 'vitest'
import * as mysql from '../sql-generators/mysql'
import * as pg from '../sql-generators/postgresql'
import * as sqlite from '../sql-generators/sqlite'

const pgCol: pg.ColumnDef = { name: 'email', type: 'TEXT', nullable: false }
const idx: pg.IndexDef = {
	name: 'users_email_idx',
	table: 'users',
	columns: ['email'],
}

describe('PostgreSQL SQL generator', () => {
	it('createTable generates correct SQL', () => {
		const sql = pg.createTable('users', [
			{ name: 'id', type: 'UUID', primaryKey: true },
			{ name: 'email', type: 'TEXT', nullable: false },
		])
		expect(sql).toContain('CREATE TABLE "users"')
		expect(sql).toContain('"id" UUID PRIMARY KEY')
		expect(sql).toContain('"email" TEXT NOT NULL')
	})

	it('dropTable generates correct SQL', () => {
		expect(pg.dropTable('users')).toBe('DROP TABLE "users"')
	})

	it('addColumn generates correct SQL', () => {
		const sql = pg.addColumn('users', pgCol)
		expect(sql).toContain('ALTER TABLE "users" ADD COLUMN')
		expect(sql).toContain('"email" TEXT NOT NULL')
	})

	it('dropColumn generates correct SQL', () => {
		expect(pg.dropColumn('users', 'email')).toBe(
			'ALTER TABLE "users" DROP COLUMN "email"',
		)
	})

	it('alterColumnType generates correct SQL', () => {
		const sql = pg.alterColumnType('users', 'age', 'INTEGER')
		expect(sql).toContain('ALTER TABLE "users" ALTER COLUMN "age" TYPE INTEGER')
	})

	it('createIndex generates correct SQL', () => {
		expect(pg.createIndex(idx)).toContain(
			'INDEX "users_email_idx" ON "users" ("email")',
		)
	})

	it('createIndex with unique flag', () => {
		expect(pg.createIndex({ ...idx, unique: true })).toContain('UNIQUE INDEX')
	})

	it('dropIndex generates correct SQL', () => {
		expect(pg.dropIndex('users_email_idx')).toBe('DROP INDEX "users_email_idx"')
	})
})

describe('MySQL SQL generator', () => {
	it('createTable uses backtick quoting', () => {
		const sql = mysql.createTable('users', [
			{ name: 'id', type: 'VARCHAR(36)', primaryKey: true },
		])
		expect(sql).toContain('CREATE TABLE `users`')
		expect(sql).toContain('`id`')
	})

	it('dropTable generates correct SQL', () => {
		expect(mysql.dropTable('users')).toBe('DROP TABLE `users`')
	})

	it('addColumn generates correct SQL', () => {
		const sql = mysql.addColumn('users', {
			name: 'email',
			type: 'VARCHAR(255)',
			nullable: false,
		})
		expect(sql).toContain('ALTER TABLE `users` ADD COLUMN')
		expect(sql).toContain('`email` VARCHAR(255) NOT NULL')
	})

	it('dropColumn generates correct SQL', () => {
		expect(mysql.dropColumn('users', 'email')).toBe(
			'ALTER TABLE `users` DROP COLUMN `email`',
		)
	})

	it('modifyColumn generates correct SQL for type changes', () => {
		const sql = mysql.modifyColumn('users', {
			name: 'age',
			type: 'BIGINT',
			nullable: true,
		})
		expect(sql).toContain('MODIFY COLUMN')
		expect(sql).toContain('`age` BIGINT')
	})

	it('createIndex generates correct SQL', () => {
		const sql = mysql.createIndex({
			name: 'users_email_idx',
			table: 'users',
			columns: ['email'],
		})
		expect(sql).toContain('INDEX `users_email_idx` ON `users`')
	})

	it('dropIndex requires table name', () => {
		expect(mysql.dropIndex('users_email_idx', 'users')).toContain('DROP INDEX')
	})
})

describe('SQLite SQL generator', () => {
	it('createTable generates correct SQL', () => {
		const sql = sqlite.createTable('users', [
			{ name: 'id', type: 'TEXT', primaryKey: true },
		])
		expect(sql).toContain('CREATE TABLE "users"')
		expect(sql).toContain('"id" TEXT PRIMARY KEY')
	})

	it('dropTable generates correct SQL', () => {
		expect(sqlite.dropTable('users')).toBe('DROP TABLE "users"')
	})

	it('addColumn generates simple SQL (SQLite limitations)', () => {
		const sql = sqlite.addColumn('users', { name: 'email', type: 'TEXT' })
		expect(sql).toContain('ALTER TABLE "users" ADD COLUMN')
		expect(sql).not.toContain('NOT NULL') // SQLite ADD COLUMN cannot have NOT NULL without DEFAULT
	})

	it('createIndex generates correct SQL', () => {
		const sql = sqlite.createIndex({
			name: 'users_email_idx',
			table: 'users',
			columns: ['email'],
		})
		expect(sql).toContain('INDEX "users_email_idx" ON "users"')
	})

	it('dropIndex generates correct SQL', () => {
		expect(sqlite.dropIndex('users_email_idx')).toBe(
			'DROP INDEX "users_email_idx"',
		)
	})
})
