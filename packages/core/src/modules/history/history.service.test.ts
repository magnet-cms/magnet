import { describe, expect, it } from 'bun:test'

/**
 * Unit tests for HistoryService.computeDiff logic.
 * Tests the pure diff algorithm in isolation.
 */

// Extracted logic for unit testing (mirrors HistoryService.computeDiff)
function computeDiff(
	before: Record<string, unknown>,
	after: Record<string, unknown>,
) {
	const changes: Array<{
		field: string
		before: unknown
		after: unknown
		type: 'added' | 'removed' | 'modified'
	}> = []
	const allFields = new Set([...Object.keys(before), ...Object.keys(after)])

	for (const field of allFields) {
		const hadField = Object.prototype.hasOwnProperty.call(before, field)
		const hasField = Object.prototype.hasOwnProperty.call(after, field)

		if (!hadField && hasField) {
			changes.push({
				field,
				before: undefined,
				after: after[field],
				type: 'added',
			})
		} else if (hadField && !hasField) {
			changes.push({
				field,
				before: before[field],
				after: undefined,
				type: 'removed',
			})
		} else if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
			changes.push({
				field,
				before: before[field],
				after: after[field],
				type: 'modified',
			})
		}
	}

	return changes
}

describe('computeDiff', () => {
	it('returns empty array when objects are identical', () => {
		const result = computeDiff({ title: 'Hello' }, { title: 'Hello' })
		expect(result).toHaveLength(0)
	})

	it('detects modified fields', () => {
		const result = computeDiff({ title: 'Old' }, { title: 'New' })
		expect(result).toHaveLength(1)
		expect(result[0]).toEqual({
			field: 'title',
			before: 'Old',
			after: 'New',
			type: 'modified',
		})
	})

	it('detects added fields', () => {
		const result = computeDiff({}, { title: 'New' })
		expect(result).toHaveLength(1)
		expect(result[0]).toEqual({
			field: 'title',
			before: undefined,
			after: 'New',
			type: 'added',
		})
	})

	it('detects removed fields', () => {
		const result = computeDiff({ title: 'Old' }, {})
		expect(result).toHaveLength(1)
		expect(result[0]).toEqual({
			field: 'title',
			before: 'Old',
			after: undefined,
			type: 'removed',
		})
	})

	it('uses deep equality for nested objects', () => {
		const before = { meta: { tags: ['a', 'b'] } }
		const after = { meta: { tags: ['a', 'c'] } }
		const result = computeDiff(before, after)
		expect(result).toHaveLength(1)
		expect(result[0]?.type).toBe('modified')
	})

	it('does not flag identical nested objects as changed', () => {
		const obj = { meta: { tags: ['a', 'b'] } }
		const result = computeDiff(obj, { ...obj })
		expect(result).toHaveLength(0)
	})

	it('handles multiple changes at once', () => {
		const result = computeDiff(
			{ title: 'Old', body: 'Keep', removed: 'gone' },
			{ title: 'New', body: 'Keep', added: 'here' },
		)
		const types = result.map((c) => c.type)
		expect(types).toContain('modified')
		expect(types).toContain('removed')
		expect(types).toContain('added')
		expect(result).toHaveLength(3)
	})
})
