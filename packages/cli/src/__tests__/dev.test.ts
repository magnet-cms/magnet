import { describe, expect, it } from 'vitest'

import { runDbReset } from '../commands/db-reset'
import { runDev } from '../commands/dev'
import { runDockerDown, runDockerLogs, runDockerUp } from '../commands/docker'

describe('dev command', () => {
  it('exports runDev as an async function', () => {
    expect(typeof runDev).toBe('function')
    // Verify it returns a promise (async function)
    expect(runDev.constructor.name).toBe('AsyncFunction')
  })
})

describe('db:reset command', () => {
  it('exports runDbReset as an async function', () => {
    expect(typeof runDbReset).toBe('function')
    expect(runDbReset.constructor.name).toBe('AsyncFunction')
  })

  it('accepts options with force flag', () => {
    // Verify function signature accepts options
    expect(runDbReset.length).toBe(1)
  })
})

describe('docker commands', () => {
  it('exports runDockerUp as an async function', () => {
    expect(typeof runDockerUp).toBe('function')
    expect(runDockerUp.constructor.name).toBe('AsyncFunction')
  })

  it('exports runDockerDown as an async function accepting options', () => {
    expect(typeof runDockerDown).toBe('function')
    expect(runDockerDown.constructor.name).toBe('AsyncFunction')
    expect(runDockerDown.length).toBe(1)
  })

  it('exports runDockerLogs as an async function', () => {
    expect(typeof runDockerLogs).toBe('function')
    expect(runDockerLogs.constructor.name).toBe('AsyncFunction')
  })
})
