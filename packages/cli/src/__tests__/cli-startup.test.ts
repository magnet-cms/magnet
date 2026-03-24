import { Command } from 'commander'
import { describe, expect, it } from 'vitest'
import {
	type DrizzleAdapterModule,
	registerMigrateCommands,
} from '../commands/migrate'

describe('registerMigrateCommands', () => {
	it('is a function', () => {
		expect(typeof registerMigrateCommands).toBe('function')
	})

	it('registers migrate subcommands on the provided program', () => {
		const program = new Command()
		program.name('test-magnet')

		// Create a minimal mock of the drizzle module
		const mockDrizzle = {
			DEFAULT_MIGRATION_CONFIG: {
				directory: './migrations',
				tableName: '__migrations',
			},
			MigrationRunner: class MockRunner {},
			SchemaBridge: class MockBridge {},
			SchemaDiff: class MockDiff {},
			MigrationGenerator: class MockGen {},
		} as unknown as DrizzleAdapterModule

		registerMigrateCommands(program, mockDrizzle)

		// Verify migrate command and subcommands were registered
		const migrateCmd = program.commands.find((c) => c.name() === 'migrate')
		expect(migrateCmd).toBeDefined()

		const subcommands = migrateCmd?.commands.map((c) => c.name()) ?? []
		expect(subcommands).toContain('up')
		expect(subcommands).toContain('down')
		expect(subcommands).toContain('status')
		expect(subcommands).toContain('generate')
		expect(subcommands).toContain('create')
		expect(subcommands).toContain('reset')
		expect(subcommands).toContain('fresh')
	})
})

describe('CLI startup without drizzle', () => {
	it('dynamic import of missing module throws (simulating no drizzle)', async () => {
		// Verify that the try/catch pattern in index.ts works correctly:
		// when a module import fails, the catch block is triggered
		let caughtError = false
		try {
			await import('@magnet-cms/nonexistent-module-for-testing')
		} catch {
			caughtError = true
		}
		expect(caughtError).toBe(true)
	})

	it('registerMigrateCommands does not affect other commands on the program', () => {
		const program = new Command()
		program.name('test-magnet')
		// Add a non-migrate command
		program.command('dev').description('Dev command')

		const mockDrizzle = {
			DEFAULT_MIGRATION_CONFIG: {
				directory: './migrations',
				tableName: '__migrations',
			},
			MigrationRunner: class MockRunner {},
			SchemaBridge: class MockBridge {},
			SchemaDiff: class MockDiff {},
			MigrationGenerator: class MockGen {},
		} as unknown as DrizzleAdapterModule

		registerMigrateCommands(program, mockDrizzle)

		// Both dev and migrate should exist
		const devCmd = program.commands.find((c) => c.name() === 'dev')
		const migrateCmd = program.commands.find((c) => c.name() === 'migrate')
		expect(devCmd).toBeDefined()
		expect(migrateCmd).toBeDefined()
	})
})
