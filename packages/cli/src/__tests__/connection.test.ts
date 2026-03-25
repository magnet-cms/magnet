import { describe, expect, it } from 'vitest'
import { createConnection } from '../utils/connection'

describe('createConnection', () => {
	it('throws for unsupported URL scheme', async () => {
		await expect(createConnection('mongodb://localhost/test')).rejects.toThrow(
			'Unsupported database URL scheme',
		)
	})

	it('throws with helpful message listing supported schemes', async () => {
		await expect(createConnection('redis://localhost')).rejects.toThrow(
			'postgresql://',
		)
	})

	it('accepts postgresql:// scheme without error on scheme detection', async () => {
		// We can't test the actual connection without a DB, but we can test that
		// the routing logic picks the right path (it will fail on the actual import
		// if pg/neon isn't configured, but the error should NOT be "Unsupported scheme")
		const err = await createConnection('postgresql://localhost/test').catch(
			(e) => e as Error,
		)
		expect(err.message).not.toContain('Unsupported database URL scheme')
	})

	it('accepts postgres:// alias scheme', async () => {
		const err = await createConnection('postgres://localhost/test').catch(
			(e) => e as Error,
		)
		expect(err.message).not.toContain('Unsupported database URL scheme')
	})

	it('accepts mysql:// scheme without routing error', async () => {
		const err = await createConnection('mysql://localhost/test').catch(
			(e) => e as Error,
		)
		expect(err.message).not.toContain('Unsupported database URL scheme')
	})

	it('accepts .db SQLite file path', async () => {
		const result = await createConnection('/tmp/test.db').catch(
			(e) => e as Error,
		)
		const msg = result instanceof Error ? result.message : 'connected-ok'
		expect(msg).not.toContain('Unsupported database URL scheme')
	})

	it('accepts :memory: SQLite path', async () => {
		const result = await createConnection(':memory:').catch((e) => e as Error)
		const msg = result instanceof Error ? result.message : 'connected-ok'
		expect(msg).not.toContain('Unsupported database URL scheme')
	})
})
