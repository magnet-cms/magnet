import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { generateProject } from '../generators/index.js'
import type { ProjectConfig } from '../types.js'

describe('generateProject — Supabase CLI mode integration', () => {
	let tmpDir: string

	afterEach(() => {
		if (tmpDir && fs.existsSync(tmpDir)) {
			fs.rmSync(tmpDir, { recursive: true })
		}
	})

	it('generates supabase/config.toml instead of docker-compose when CLI mode', async () => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magnet-test-'))
		const projectPath = path.join(tmpDir, 'my-supabase-app')

		const config: ProjectConfig = {
			projectName: 'my-supabase-app',
			projectPath,
			database: 'drizzle-supabase',
			plugins: [],
			storage: 'none',
			vault: 'db',
			packageManager: 'npm',
			includeExample: false,
			supabaseLocalMode: 'cli',
		}

		await generateProject(config)

		// supabase/config.toml should exist
		const configToml = path.join(projectPath, 'supabase', 'config.toml')
		expect(fs.existsSync(configToml)).toBe(true)

		const content = fs.readFileSync(configToml, 'utf-8')
		expect(content).toContain('id = "my-supabase-app"')

		// docker/docker-compose.yml should NOT exist
		const dockerCompose = path.join(projectPath, 'docker', 'docker-compose.yml')
		expect(fs.existsSync(dockerCompose)).toBe(false)
	})

	it('generates docker-compose when postgres mode', async () => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magnet-test-'))
		const projectPath = path.join(tmpDir, 'my-pg-app')

		const config: ProjectConfig = {
			projectName: 'my-pg-app',
			projectPath,
			database: 'drizzle-supabase',
			plugins: [],
			storage: 'none',
			vault: 'db',
			packageManager: 'npm',
			includeExample: false,
			supabaseLocalMode: 'postgres',
		}

		await generateProject(config)

		// docker/docker-compose.yml should exist
		const dockerCompose = path.join(projectPath, 'docker', 'docker-compose.yml')
		expect(fs.existsSync(dockerCompose)).toBe(true)

		const content = fs.readFileSync(dockerCompose, 'utf-8')
		expect(content).toContain('POSTGRES_USER: magnet')

		// supabase/config.toml should NOT exist
		const configToml = path.join(projectPath, 'supabase', 'config.toml')
		expect(fs.existsSync(configToml)).toBe(false)
	})
})
