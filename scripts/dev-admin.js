#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

process.env.NODE_ENV = 'development'

// Set example-specific environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/cats-example'
process.env.JWT_SECRET = 'test-secret-key'
process.env.VAULT_ADDR = 'http://localhost:8200'
process.env.VAULT_TOKEN = 'dev-token'
process.env.SMTP_HOST = 'localhost'
process.env.SMTP_PORT = '1025'
process.env.EMAIL_FROM = 'noreply@magnet.local'
process.env.TEMPLATE_NAME = 'mongoose'
process.env.MAGNET_PLAYGROUND_MODULES_PATH =
	'/tmp/magnet-e2e-playground-modules'

console.log('Starting admin development environment for mongoose...')

const nestjs = spawn('bun', ['run', 'dev'], {
	cwd: resolve(projectRoot, 'apps', 'examples', 'mongoose'),
	stdio: 'inherit',
	shell: true,
	env: { ...process.env, NODE_ENV: 'development' },
})

const vite = spawn('bun', ['run', 'dev'], {
	cwd: resolve(projectRoot, 'packages', 'client', 'admin'),
	stdio: 'inherit',
	shell: true,
})

console.log('NestJS server and Vite dev server started')

process.on('SIGINT', () => {
	nestjs.kill('SIGINT')
	vite.kill('SIGINT')
	process.exit(0)
})

process.on('SIGTERM', () => {
	nestjs.kill('SIGTERM')
	vite.kill('SIGTERM')
	process.exit(0)
})
