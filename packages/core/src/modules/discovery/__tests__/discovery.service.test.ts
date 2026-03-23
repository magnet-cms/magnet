import { describe, expect, it } from 'bun:test'
import type { SchemaMetadata } from '@magnet-cms/common'

/**
 * Unit tests for DiscoveryService filtering logic.
 * Tests the schema filtering rules in isolation (mirrors DiscoveryService.getAllDiscoveredSchemas).
 */

const EXCLUDED_SCHEMAS = ['setting', 'history']

function filterSchemas(schemas: SchemaMetadata[]): SchemaMetadata[] {
	return schemas
		.filter((schema) => !EXCLUDED_SCHEMAS.includes(schema.name.toLowerCase()))
		.filter((schema) => schema.options?.visible !== false)
}

const makeSchema = (
	name: string,
	opts?: SchemaMetadata['options'],
): SchemaMetadata => ({
	name,
	apiName: name,
	displayName: name.charAt(0).toUpperCase() + name.slice(1),
	properties: [],
	options: opts,
})

describe('DiscoveryService schema filtering', () => {
	it('should return all visible non-excluded schemas', () => {
		const schemas = [makeSchema('article'), makeSchema('product')]
		const result = filterSchemas(schemas)
		expect(result).toHaveLength(2)
		expect(result.map((s) => s.name)).toEqual(['article', 'product'])
	})

	it('should filter out excluded schema names (setting, history)', () => {
		const schemas = [
			makeSchema('article'),
			makeSchema('setting'),
			makeSchema('history'),
		]
		const result = filterSchemas(schemas)
		expect(result).toHaveLength(1)
		expect(result[0].name).toBe('article')
	})

	it('should filter out schemas with visible: false', () => {
		const schemas = [
			makeSchema('article'),
			makeSchema('internal', { visible: false }),
		]
		const result = filterSchemas(schemas)
		expect(result).toHaveLength(1)
		expect(result[0].name).toBe('article')
	})

	it('should keep read-only schemas (readOnly does not hide from list)', () => {
		const schemas = [
			makeSchema('article'),
			makeSchema('audit-log', { readOnly: true }),
		]
		const result = filterSchemas(schemas)
		expect(result).toHaveLength(2)
	})

	it('should keep schemas with autoSave: false', () => {
		const schemas = [makeSchema('article', { autoSave: false })]
		const result = filterSchemas(schemas)
		expect(result).toHaveLength(1)
	})

	it('should return SchemaMetadata objects (not strings)', () => {
		const schemas = [makeSchema('article')]
		const result = filterSchemas(schemas)
		expect(typeof result[0]).toBe('object')
		expect(result[0]).toHaveProperty('name')
		expect(result[0]).toHaveProperty('properties')
	})

	it('should preserve schema options including autoSave and readOnly', () => {
		const schemas = [makeSchema('logs', { autoSave: false, readOnly: true })]
		const result = filterSchemas(schemas)
		expect(result[0].options?.autoSave).toBe(false)
		expect(result[0].options?.readOnly).toBe(true)
	})
})
