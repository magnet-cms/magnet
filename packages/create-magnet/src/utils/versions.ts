/**
 * Package versions for generated projects.
 * These should be updated when new versions of Magnet packages are released.
 */
export const PACKAGE_VERSIONS = {
	// Magnet CMS packages
	'@magnet-cms/core': '^1.0.0',
	'@magnet-cms/common': '^0.1.0',
	'@magnet-cms/adapter-mongoose': '^1.0.0',
	'@magnet-cms/adapter-drizzle': '^1.0.0',
	'@magnet-cms/adapter-supabase': '^1.0.0',
	'@magnet-cms/plugin-content-builder': '^1.0.0',
	'@magnet-cms/plugin-seo': '^0.1.0',

	// NestJS
	'@nestjs/common': '^11.1.12',
	'@nestjs/core': '^11.1.12',
	'@nestjs/config': '^4.0.0',
	'@nestjs/platform-express': '^11.1.12',
	'@nestjs/cli': '^11.0.16',
	'@nestjs/schematics': '^11.0.9',

	// Database drivers
	mongoose: '^8.10.0',
	'drizzle-orm': '^0.38.0',
	'@neondatabase/serverless': '^0.10.0',
	pg: '^8.13.0',
	'@supabase/supabase-js': '^2.49.0',

	// Runtime dependencies
	'class-validator': '^0.14.1',
	'class-transformer': '^0.5.1',
	'reflect-metadata': '^0.2.2',
	rxjs: '^7.8.1',

	// Dev dependencies
	typescript: '^5.7.3',
	'cross-env': '^7.0.3',
	'@types/node': '^22.13.1',
	'@types/express': '^5.0.0',
	'source-map-support': '^0.5.21',
	'ts-loader': '^9.4.3',
	'ts-node': '^10.9.1',
	'tsconfig-paths': '^4.2.0',
} as const

export type PackageVersions = typeof PACKAGE_VERSIONS
