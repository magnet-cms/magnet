import ansis from 'ansis'

import { findComposeFile, runCompose } from '../utils/docker'

function getComposeFileOrExit(): string {
  const composeFile = findComposeFile(process.cwd())
  if (!composeFile) {
    console.error(ansis.red('✗'), 'No docker/docker-compose.yml found in current directory.')
    process.exit(1)
  }
  return composeFile
}

/**
 * Start Docker Compose services in detached mode.
 */
export async function runDockerUp(): Promise<void> {
  const composeFile = getComposeFileOrExit()
  console.log(ansis.cyan('Starting Docker services...'))
  const code = await runCompose(composeFile, ['up', '-d'])
  if (code === 0) {
    console.log(ansis.green('✓ Docker services started'))
  }
  process.exit(code)
}

/**
 * Stop Docker Compose services.
 */
export async function runDockerDown(options: { volumes?: boolean }): Promise<void> {
  const composeFile = getComposeFileOrExit()
  const args = ['down']
  if (options.volumes) {
    args.push('--volumes')
  }
  console.log(ansis.cyan('Stopping Docker services...'))
  const code = await runCompose(composeFile, args)
  if (code === 0) {
    console.log(ansis.green('✓ Docker services stopped'))
  }
  process.exit(code)
}

/**
 * Stream Docker Compose logs.
 */
export async function runDockerLogs(): Promise<void> {
  const composeFile = getComposeFileOrExit()
  const code = await runCompose(composeFile, ['logs', '-f'])
  process.exit(code)
}
