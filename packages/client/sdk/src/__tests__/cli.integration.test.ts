/**
 * Integration test for runGenerate — uses real openapi-typescript (no mocks).
 * Validates that the v7+ programmatic API produces output containing `export interface paths`.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { runGenerate } from '../cli'

const MINIMAL_SPEC = JSON.stringify({
	openapi: '3.0.3',
	info: { title: 'Test', version: '1.0.0' },
	paths: {
		'/health': {
			get: {
				operationId: 'getHealth',
				responses: { '200': { description: 'OK' } },
			},
		},
	},
})

describe('runGenerate (integration — real openapi-typescript)', () => {
	it('should produce output containing export interface paths', async () => {
		const specPath = resolve(tmpdir(), 'magnet-test-spec.json')
		const outPath = resolve(tmpdir(), 'magnet-test-output.d.ts')

		writeFileSync(specPath, MINIMAL_SPEC)
		await runGenerate({ input: specPath, output: outPath })

		const output = readFileSync(outPath, 'utf-8')
		expect(output).toContain('export interface paths')
	})
})
