import 'reflect-metadata'
import { describe, expect, it, vi } from 'vitest'

// Mock helmet to capture the configuration it's called with
vi.mock('helmet', () => {
  const mockHelmet = vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next())
  return { default: mockHelmet }
})

describe('SecurityModule', () => {
  it('should export SecurityModule class', async () => {
    const { SecurityModule } = await import('../security.module')
    expect(SecurityModule).toBeDefined()
  })

  it('should implement NestModule (has configure method)', async () => {
    const { SecurityModule } = await import('../security.module')
    const instance = new SecurityModule()
    expect(typeof instance.configure).toBe('function')
  })

  it('should apply helmet middleware to all routes', async () => {
    const helmet = (await import('helmet')).default
    const { SecurityModule } = await import('../security.module')

    const mockApply = vi.fn().mockReturnValue({ forRoutes: vi.fn() })
    const mockConsumer = { apply: mockApply }

    const instance = new SecurityModule()
    instance.configure(mockConsumer as never)

    // helmet should be called to create the middleware
    expect(helmet).toHaveBeenCalledWith(
      expect.objectContaining({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
      }),
    )

    // consumer.apply should be called with the middleware
    expect(mockApply).toHaveBeenCalled()
  })
})
