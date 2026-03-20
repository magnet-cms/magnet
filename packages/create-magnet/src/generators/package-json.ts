import type { ProjectConfig } from '../types.js'
import { PACKAGE_VERSIONS } from '../utils/versions.js'

export function generatePackageJson(config: ProjectConfig): string {
	const { projectName, database, plugins, storage, vault } = config

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
		dependencies['@magnet-cms/adapter-db-mongoose'] =
			PACKAGE_VERSIONS['@magnet-cms/adapter-db-mongoose']
		dependencies.mongoose = PACKAGE_VERSIONS.mongoose
	} else {
		dependencies['@magnet-cms/adapter-db-drizzle'] =
			PACKAGE_VERSIONS['@magnet-cms/adapter-db-drizzle']
		dependencies['drizzle-orm'] = PACKAGE_VERSIONS['drizzle-orm']

		if (database === 'drizzle-neon') {
			dependencies['@neondatabase/serverless'] =
				PACKAGE_VERSIONS['@neondatabase/serverless']
		} else if (database === 'drizzle-supabase') {
			dependencies['@magnet-cms/adapter-auth-supabase'] =
				PACKAGE_VERSIONS['@magnet-cms/adapter-auth-supabase']
			dependencies['@supabase/supabase-js'] =
				PACKAGE_VERSIONS['@supabase/supabase-js']
			dependencies.pg = PACKAGE_VERSIONS.pg
		}
	}

	// Add plugins
	if (plugins.includes('playground')) {
		dependencies['@magnet-cms/plugin-playground'] =
			PACKAGE_VERSIONS['@magnet-cms/plugin-playground']
	}
	if (plugins.includes('seo')) {
		dependencies['@magnet-cms/plugin-seo'] =
			PACKAGE_VERSIONS['@magnet-cms/plugin-seo']
	}

	// Add storage adapter packages when not using local
	if (storage === 's3') {
		dependencies['@magnet-cms/adapter-storage-s3'] =
			PACKAGE_VERSIONS['@magnet-cms/adapter-storage-s3'] ?? '^1.0.0'
	} else if (storage === 'r2') {
		dependencies['@magnet-cms/adapter-storage-r2'] =
			PACKAGE_VERSIONS['@magnet-cms/adapter-storage-r2'] ?? '^1.0.0'
	} else if (storage === 'supabase') {
		dependencies['@magnet-cms/adapter-storage-supabase'] =
			PACKAGE_VERSIONS['@magnet-cms/adapter-storage-supabase']
		dependencies['@supabase/supabase-js'] =
			dependencies['@supabase/supabase-js'] ??
			PACKAGE_VERSIONS['@supabase/supabase-js']
	}

	// Add vault adapter packages when not using the built-in DB adapter
	if (vault === 'hashicorp') {
		dependencies['@magnet-cms/adapter-vault-hashicorp'] =
			PACKAGE_VERSIONS['@magnet-cms/adapter-vault-hashicorp']
	} else if (vault === 'supabase') {
		dependencies['@magnet-cms/adapter-vault-supabase'] =
			PACKAGE_VERSIONS['@magnet-cms/adapter-vault-supabase']
		dependencies['@supabase/supabase-js'] =
			dependencies['@supabase/supabase-js'] ??
			PACKAGE_VERSIONS['@supabase/supabase-js']
	}

	const scripts: Record<string, string> = {
		build: 'nest build',
		start: 'nest start',
		'start:prod': 'cross-env NODE_ENV=production nest start',
		dev: 'magnet dev',
		'dev:app': 'nest start --watch',
		'dev:debug': 'nest start --debug --watch',
		'docker:up': 'magnet docker up',
		'docker:down': 'magnet docker down',
		'docker:logs': 'magnet docker logs',
		'db:reset': 'magnet db:reset',
	}

	// Add migrate scripts for Drizzle projects (space-separated Commander subcommands)
	if (database !== 'mongoose') {
		scripts['migrate:up'] = 'magnet migrate up'
		scripts['migrate:down'] = 'magnet migrate down'
		scripts['migrate:status'] = 'magnet migrate status'
		scripts['migrate:generate'] = 'magnet migrate generate'
		scripts['migrate:create'] = 'magnet migrate create'
	}

	const devDependencies: Record<string, string> = {
		'@magnet-cms/cli': '^0.1.0',
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
