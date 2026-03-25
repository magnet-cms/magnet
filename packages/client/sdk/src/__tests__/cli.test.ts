import { writeFileSync } from 'node:fs'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('openapi-typescript', () => ({
  default: vi.fn().mockResolvedValue('mock-ast'),
  astToString: vi.fn().mockReturnValue('export type paths = {}'),
}))

vi.mock('node:fs', () => ({
  writeFileSync: vi.fn(),
  readFileSync: vi
    .fn()
    .mockReturnValue('{"openapi":"3.0.0","info":{"title":"T","version":"1"},"paths":{}}'),
  existsSync: vi.fn().mockReturnValue(true),
}))

import { runGenerate } from '../cli'

const mockWriteFileSync = writeFileSync as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  mockWriteFileSync.mockReset()
})

describe('runGenerate', () => {
  it('should write output to specified file path', async () => {
    await runGenerate({
      url: 'http://localhost:3000/oas.json',
      output: './magnet.d.ts',
    })
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining('magnet.d.ts'),
      expect.stringContaining('export type paths'),
      'utf-8',
    )
  })

  it('should use local input file when --input is provided', async () => {
    await runGenerate({ input: './openapi.json', output: './magnet.d.ts' })
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining('magnet.d.ts'),
      expect.any(String),
      'utf-8',
    )
  })

  it('should throw when neither url nor input is provided', async () => {
    await expect(runGenerate({ output: './magnet.d.ts' })).rejects.toThrow()
  })
})
