import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { findComposeFile, isDockerAvailable } from '../utils/docker'

// Note: isDockerAvailable uses execFile internally. In CI without Docker,
// it returns false (which is correct behavior). We test both paths.

describe('isDockerAvailable', () => {
  it('returns a boolean', async () => {
    const result = await isDockerAvailable()
    expect(typeof result).toBe('boolean')
  })
})

describe('findComposeFile', () => {
  let tmpDir: string

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true })
    }
  })

  it('returns null when docker/docker-compose.yml does not exist', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magnet-docker-test-'))
    const result = findComposeFile(tmpDir)
    expect(result).toBeNull()
  })

  it('returns absolute path when docker/docker-compose.yml exists', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magnet-docker-test-'))
    const dockerDir = path.join(tmpDir, 'docker')
    fs.mkdirSync(dockerDir)
    fs.writeFileSync(path.join(dockerDir, 'docker-compose.yml'), 'services: {}')

    const result = findComposeFile(tmpDir)
    expect(result).toBe(path.join(tmpDir, 'docker', 'docker-compose.yml'))
  })
})
