import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { CacheAdapter, CacheHealthResult } from '@magnet-cms/common'
import { CacheService } from '../cache.service'

const mockGet = mock(async (_key: string) => null as unknown)
const mockSet = mock(async () => {})
const mockDelete = mock(async () => {})
const mockDeleteByPattern = mock(async () => {})
const mockHas = mock(async () => false)
const mockClear = mock(async () => {})
const mockHealthCheck = mock(
	async (): Promise<CacheHealthResult> => ({ healthy: true }),
)

const mockAdapter: CacheAdapter = {
	name: 'mock',
	get: mockGet,
	set: mockSet,
	delete: mockDelete,
	deleteByPattern: mockDeleteByPattern,
	has: mockHas,
	clear: mockClear,
	healthCheck: mockHealthCheck,
}

describe('CacheService', () => {
	let service: CacheService

	beforeEach(() => {
		mockGet.mockReset()
		mockGet.mockResolvedValue(null)
		mockSet.mockReset()
		mockSet.mockResolvedValue(undefined)
		mockDelete.mockReset()
		mockDeleteByPattern.mockReset()
		mockHas.mockReset()
		mockHas.mockResolvedValue(false)
		mockClear.mockReset()
		mockHealthCheck.mockReset()
		mockHealthCheck.mockResolvedValue({ healthy: true })
		service = new CacheService(mockAdapter)
	})

	it('should delegate get to adapter', async () => {
		mockGet.mockResolvedValueOnce('cached-value')
		const result = await service.get('my-key')
		expect(result).toBe('cached-value')
		expect(mockGet).toHaveBeenCalledWith('my-key')
	})

	it('should delegate set to adapter with explicit TTL', async () => {
		await service.set('my-key', { data: 1 }, 60)
		expect(mockSet).toHaveBeenCalledWith('my-key', { data: 1 }, 60)
	})

	it('should use default TTL (300s) when no settings service and no TTL provided', async () => {
		await service.set('my-key', 'val')
		expect(mockSet).toHaveBeenCalledWith('my-key', 'val', 300)
	})

	it('should delegate delete to adapter', async () => {
		await service.delete('my-key')
		expect(mockDelete).toHaveBeenCalledWith('my-key')
	})

	it('should delegate deleteByPattern to adapter', async () => {
		await service.deleteByPattern('posts:*')
		expect(mockDeleteByPattern).toHaveBeenCalledWith('posts:*')
	})

	it('should delegate has to adapter', async () => {
		mockHas.mockResolvedValueOnce(true)
		const result = await service.has('my-key')
		expect(result).toBe(true)
		expect(mockHas).toHaveBeenCalledWith('my-key')
	})

	it('should delegate clear to adapter', async () => {
		await service.clear()
		expect(mockClear).toHaveBeenCalledTimes(1)
	})

	it('should delegate healthCheck to adapter', async () => {
		const result = await service.healthCheck()
		expect(result.healthy).toBe(true)
		expect(mockHealthCheck).toHaveBeenCalledTimes(1)
	})

	it('should expose adapter name', () => {
		expect(service.adapterName).toBe('mock')
	})
})
