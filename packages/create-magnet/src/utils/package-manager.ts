import { execSync, spawn } from 'node:child_process'
import * as fs from 'node:fs'

import type { PackageManager, ProjectConfig } from '../types.js'

/**
 * Detects the package manager used to run this CLI
 */
export function detectPackageManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent

  if (userAgent) {
    if (userAgent.includes('bun')) return 'bun'
    if (userAgent.includes('pnpm')) return 'pnpm'
    if (userAgent.includes('yarn')) return 'yarn'
    if (userAgent.includes('npm')) return 'npm'
  }

  // Check for lockfiles in current directory
  if (fs.existsSync('bun.lockb') || fs.existsSync('bun.lock')) return 'bun'
  if (fs.existsSync('pnpm-lock.yaml')) return 'pnpm'
  if (fs.existsSync('yarn.lock')) return 'yarn'

  // Default to npm
  return 'npm'
}

/**
 * Checks if a package manager is available
 */
export function isPackageManagerAvailable(pm: PackageManager): boolean {
  try {
    execSync(`${pm} --version`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * Gets the install command for the given package manager
 */
export function getInstallCommand(pm: PackageManager): string {
  switch (pm) {
    case 'bun':
      return 'bun install'
    case 'pnpm':
      return 'pnpm install'
    case 'yarn':
      return 'yarn'
    default:
      return 'npm install'
  }
}

/**
 * Installs dependencies in the project directory
 */
export function installDependencies(config: ProjectConfig): Promise<void> {
  const { projectPath, packageManager } = config

  return new Promise((resolve, reject) => {
    const [cmd, ...args] =
      packageManager === 'yarn'
        ? ['yarn']
        : packageManager === 'bun'
          ? ['bun', 'install']
          : packageManager === 'pnpm'
            ? ['pnpm', 'install']
            : ['npm', 'install']

    const child = spawn(cmd, args, {
      cwd: projectPath,
      stdio: 'ignore',
      shell: process.platform === 'win32',
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${packageManager} install failed with code ${code}`))
      }
    })

    child.on('error', (err) => {
      reject(err)
    })
  })
}
