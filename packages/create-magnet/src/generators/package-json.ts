import type { ProjectConfig } from '../types.js'
import { PACKAGE_VERSIONS } from '../utils/versions.js'

export function generatePackageJson(config: ProjectConfig): string {
	const { projectName, database, plugins, storage } = config

	const dependencies: Record<string, string> = {
		'@magnet-cms/common': PACKAGE_VERSIONS['@magnet-cms/common'],
		'@magnet-cms/core': PACKAGE_VERSIONS['@magnet-cms/core'],
		'@nestjs/common': PACKAGE_VERSIONS['@nestjs/common'],
		'@nestjs/config': PACKAGE_VERSIONS['@nestjs/config'],
		'@nestjs/core': PACKAGE_VERSIONS['@nestjs/core'],
		'@nestjs/platform-express': PACKAGE_VERSIONS['@nestjs/platform-express'],
		'class-validator': PACKAGE_VERSIONS['class-validator'],
		'class-transformer': PACKAGE_VERSIONS['class-transformer'],
		'reflect-metadata': PACKAGE_VERSIONS['reflect-metadata'],
		rxjs: PACKAGE_VERSIONS.rxjs,
	}

	// Add database adapter
	if (database === 'mongoose') {
		dependencies['@magnet-cms/adapter-mongoose'] =
			PACKAGE_VERSIONS['@magnet-cms/adapter-mongoose']
		dependencies.mongoose = PACKAGE_VERSIONS.mongoose
	} else {
		dependencies['@magnet-cms/adapter-drizzle'] =
			PACKAGE_VERSIONS['@magnet-cms/adapter-drizzle']
		dependencies['drizzle-orm'] = PACKAGE_VERSIONS['drizzle-orm']

		if (database === 'drizzle-neon') {
			dependencies['@neondatabase/serverless'] =
				PACKAGE_VERSIONS['@neondatabase/serverless']
		} else if (database === 'drizzle-supabase') {
			dependencies['@supabase/supabase-js'] =
				PACKAGE_VERSIONS['@supabase/supabase-js']
			dependencies.pg = PACKAGE_VERSIONS.pg
		}
	}

	// Add plugins
	if (plugins.includes('content-builder')) {
		dependencies['@magnet-cms/plugin-content-builder'] =
			PACKAGE_VERSIONS['@magnet-cms/plugin-content-builder']
	}
	if (plugins.includes('seo')) {
		dependencies['@magnet-cms/plugin-seo'] =
			PACKAGE_VERSIONS['@magnet-cms/plugin-seo']
	}

	// Storage adapters are part of core, no extra deps needed for local
	// S3, R2, Supabase storage would need additional config but not extra packages

	// Add migrate scripts and CLI for Drizzle projects
	const scripts: Record<string, string> = {
		build: 'nest build',
		start: 'nest start',
		'start:prod': 'cross-env NODE_ENV=production nest start',
		dev: 'nest start --watch',
		'dev:debug': 'nest start --debug --watch',
		'docker:up': 'docker compose -f docker/docker-compose.yml up -d',
		'docker:down': 'docker compose -f docker/docker-compose.yml down',
		'docker:logs': 'docker compose -f docker/docker-compose.yml logs -f',
	}

	if (database !== 'mongoose') {
		scripts['migrate:up'] = 'magnet migrate:up'
		scripts['migrate:down'] = 'magnet migrate:down'
		scripts['migrate:status'] = 'magnet migrate:status'
		scripts['migrate:generate'] = 'magnet migrate:generate'
		scripts['migrate:create'] = 'magnet migrate:create'
	}

	const devDependencies: Record<string, string> = {
		...(database !== 'mongoose' ? { '@magnet-cms/cli': '^0.1.0' } : {}),
		'@nestjs/cli': PACKAGE_VERSIONS['@nestjs/cli'],
		'@nestjs/schematics': PACKAGE_VERSIONS['@nestjs/schematics'],
		'@types/express': PACKAGE_VERSIONS['@types/express'],
		'@types/node': PACKAGE_VERSIONS['@types/node'],
		'cross-env': PACKAGE_VERSIONS['cross-env'],
		'source-map-support': PACKAGE_VERSIONS['source-map-support'],
		'ts-loader': PACKAGE_VERSIONS['ts-loader'],
		'ts-node': PACKAGE_VERSIONS['ts-node'],
		'tsconfig-paths': PACKAGE_VERSIONS['tsconfig-paths'],
		typescript: PACKAGE_VERSIONS.typescript,
	}

	const packageJson = {
		name: projectName,
		version: '0.0.1',
		description: 'A Magnet CMS project',
		private: true,
		license: 'UNLICENSED',
		scripts,
		dependencies,
		devDependencies,
	}

	return JSON.stringify(packageJson, null, 2)
}
