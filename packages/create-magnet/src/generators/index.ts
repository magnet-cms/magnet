import * as path from 'node:path'
import type { GeneratedFile, ProjectConfig } from '../types.js'
import { ensureDir, writeFile } from '../utils/fs.js'
import { generateAppModule } from './app-module.js'
import {
	generateBiomeJson,
	generateDotEnv,
	generateEnvExample,
	generateGitignore,
	generateNestCliJson,
	generateReadme,
	generateTsconfig,
	generateTsconfigBuild,
} from './config-files.js'
import { generateDockerCompose, generateSupabaseConfig } from './docker.js'
import {
	generateExampleController,
	generateExampleDto,
	generateExampleModule,
	generateExampleSchema,
	generateExampleService,
} from './example-module.js'
import { generateMain } from './main.js'
import { generatePackageJson } from './package-json.js'

export async function generateProject(config: ProjectConfig): Promise<void> {
	const { projectPath, includeExample } = config

	// Create project directory
	ensureDir(projectPath)

	// Generate all files
	const files: GeneratedFile[] = [
		// Root config files
		{ path: 'package.json', content: generatePackageJson(config) },
		{ path: 'tsconfig.json', content: generateTsconfig() },
		{ path: 'tsconfig.build.json', content: generateTsconfigBuild() },
		{ path: 'nest-cli.json', content: generateNestCliJson() },
		{ path: 'biome.json', content: generateBiomeJson() },
		{ path: '.env', content: generateDotEnv(config) },
		{ path: '.env.example', content: generateEnvExample(config) },
		{ path: '.gitignore', content: generateGitignore() },
		{ path: 'README.md', content: generateReadme(config) },

		// Docker / Supabase config
		...(config.supabaseLocalMode === 'cli'
			? [
					{
						path: 'supabase/config.toml',
						content: generateSupabaseConfig(config.projectName),
					},
				]
			: [
					{
						path: 'docker/docker-compose.yml',
						content: generateDockerCompose(config),
					},
				]),

		// Source files
		{ path: 'src/main.ts', content: generateMain() },
		{ path: 'src/app.module.ts', content: generateAppModule(config) },
	]

	// Add example module files
	if (includeExample) {
		files.push(
			{
				path: 'src/modules/items/schemas/item.schema.ts',
				content: generateExampleSchema(),
			},
			{
				path: 'src/modules/items/dto/item.dto.ts',
				content: generateExampleDto(),
			},
			{
				path: 'src/modules/items/items.service.ts',
				content: generateExampleService(),
			},
			{
				path: 'src/modules/items/items.controller.ts',
				content: generateExampleController(),
			},
			{
				path: 'src/modules/items/items.module.ts',
				content: generateExampleModule(),
			},
		)
	}

	// Add migrations directory for Drizzle projects
	if (config.database !== 'mongoose') {
		files.push({ path: 'migrations/.gitkeep', content: '' })
	}

	// Write all files
	for (const file of files) {
		const filePath = path.join(projectPath, file.path)
		writeFile(filePath, file.content)
	}
}

export { generatePackageJson } from './package-json.js'
export { generateAppModule } from './app-module.js'
export { generateMain } from './main.js'
export { generateDockerCompose, generateSupabaseConfig } from './docker.js'
export {
	generateTsconfig,
	generateTsconfigBuild,
	generateNestCliJson,
	generateBiomeJson,
	generateDotEnv,
	generateEnvExample,
	generateGitignore,
	generateReadme,
} from './config-files.js'
export {
	generateExampleSchema,
	generateExampleDto,
	generateExampleService,
	generateExampleController,
	generateExampleModule,
} from './example-module.js'
