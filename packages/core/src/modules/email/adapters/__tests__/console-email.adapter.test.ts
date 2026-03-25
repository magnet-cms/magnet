import type { EmailAdapter, SendEmailOptions } from '@magnet-cms/common'
import { describe, expect, it, vi } from 'vitest'

import { ConsoleEmailAdapter } from '../console-email.adapter'

function createMockLogger() {
  return {
    log: vi.fn(() => {}),
    warn: vi.fn(() => {}),
    error: vi.fn(() => {}),
    debug: vi.fn(() => {}),
    verbose: vi.fn(() => {}),
    fatal: vi.fn(() => {}),
    setContext: vi.fn(() => {}),
  }
}

function createMockInnerAdapter(overrides: Partial<EmailAdapter> = {}): EmailAdapter {
  return {
    name: 'mock',
    send: vi.fn(async () => ({
      id: 'mock-123',
      accepted: true,
    })),
    sendBatch: vi.fn(async (emails: SendEmailOptions[]) =>
      emails.map(() => ({ id: 'mock-123', accepted: true as const })),
    ),
    verify: vi.fn(async () => true),
    dispose: vi.fn(async () => {}),
    ...overrides,
  } as EmailAdapter
}

const testEmail: SendEmailOptions = {
  to: 'user@example.com',
  from: 'sender@example.com',
  subject: 'Test Subject',
  html: '<p>Hello World</p>',
}

describe('ConsoleEmailAdapter', () => {
  it('should send without inner adapter — logs summary and returns accepted', async () => {
    const logger = createMockLogger()
    const adapter = new ConsoleEmailAdapter(logger, null)

    const result = await adapter.send(testEmail)

    expect(result.accepted).toBe(true)
    expect(result.id).toMatch(/^console-\d+$/)
    expect(logger.log).toHaveBeenCalledTimes(1)
    const logCall = (logger.log as ReturnType<typeof mock>).mock.calls[0]?.[0] as string
    expect(logCall).toContain('user@example.com')
    expect(logCall).toContain('Test Subject')
    expect(logCall).toContain('Hello World')
  })

  it('should send with inner adapter — logs summary and delegates', async () => {
    const logger = createMockLogger()
    const inner = createMockInnerAdapter()
    const adapter = new ConsoleEmailAdapter(logger, inner)

    const result = await adapter.send(testEmail)

    expect(result.accepted).toBe(true)
    expect(result.id).toBe('mock-123')
    expect(logger.log).toHaveBeenCalledTimes(1)
    expect(inner.send).toHaveBeenCalledTimes(1)
  })

  it('should catch inner adapter failure — logs warning and returns failure', async () => {
    const logger = createMockLogger()
    const inner = createMockInnerAdapter({
      send: vi.fn(async () => {
        throw new Error('SMTP connection failed')
      }),
    })
    const adapter = new ConsoleEmailAdapter(logger, inner)

    const result = await adapter.send(testEmail)

    expect(result.accepted).toBe(false)
    expect(result.error).toBe('SMTP connection failed')
    expect(logger.log).toHaveBeenCalledTimes(1) // summary still logged
    expect(logger.warn).toHaveBeenCalledTimes(1) // failure logged
  })

  it('should sendBatch by delegating each email via send', async () => {
    const logger = createMockLogger()
    const inner = createMockInnerAdapter()
    const adapter = new ConsoleEmailAdapter(logger, inner)

    const emails: SendEmailOptions[] = [
      { ...testEmail, to: 'a@example.com' },
      { ...testEmail, to: 'b@example.com' },
    ]

    const results = await adapter.sendBatch(emails)

    expect(results).toHaveLength(2)
    expect(results[0]?.accepted).toBe(true)
    expect(results[1]?.accepted).toBe(true)
    expect(inner.send).toHaveBeenCalledTimes(2)
  })

  it('should verify — delegates to inner when present, returns true when absent', async () => {
    const logger = createMockLogger()

    // Without inner
    const adapterNoInner = new ConsoleEmailAdapter(logger, null)
    expect(await adapterNoInner.verify()).toBe(true)

    // With inner
    const inner = createMockInnerAdapter()
    const adapterWithInner = new ConsoleEmailAdapter(logger, inner)
    expect(await adapterWithInner.verify()).toBe(true)
    expect(inner.verify).toHaveBeenCalledTimes(1)
  })

  it('should report hasInnerAdapter correctly', () => {
    const logger = createMockLogger()

    const withoutInner = new ConsoleEmailAdapter(logger, null)
    expect(withoutInner.hasInnerAdapter()).toBe(false)
    expect(withoutInner.name).toBe('console')

    const inner = createMockInnerAdapter()
    const withInner = new ConsoleEmailAdapter(logger, inner)
    expect(withInner.hasInnerAdapter()).toBe(true)
    expect(withInner.name).toBe('mock')
  })

  it('should truncate long body in log summary', async () => {
    const logger = createMockLogger()
    const adapter = new ConsoleEmailAdapter(logger, null)

    const longBody = 'A'.repeat(300)
    await adapter.send({ ...testEmail, html: longBody })

    const logCall = (logger.log as ReturnType<typeof mock>).mock.calls[0]?.[0] as string
    expect(logCall).toContain('A'.repeat(200))
    expect(logCall).toContain('...')
    expect(logCall).not.toContain('A'.repeat(201))
  })
})
