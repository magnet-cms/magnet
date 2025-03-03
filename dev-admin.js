#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Set the NODE_ENV environment variable to development
process.env.NODE_ENV = 'development'

console.log('Starting admin development environment...')

// Start NestJS server
const nestjs = spawn('bun', ['run', 'start:dev'], {
	cwd: resolve(__dirname),
	stdio: 'inherit',
	shell: true,
	env: { ...process.env, NODE_ENV: 'development' },
})

// Start Vite dev server
const vite = spawn('bun', ['run', 'dev'], {
	cwd: resolve(__dirname, 'packages', 'client', 'admin'),
	stdio: 'inherit',
	shell: true,
})

console.log('NestJS server and Vite dev server started')

// Handle process termination
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
