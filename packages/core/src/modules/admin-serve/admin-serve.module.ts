import { existsSync, readFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import {
	type DynamicModule,
	Injectable,
	Logger,
	type MiddlewareConsumer,
	Module,
	type NestMiddleware,
	type NestModule,
} from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import express from 'express'

export interface AdminServeOptions {
	enabled: boolean
	path: string
	distPath?: string
}

/**
 * Resolves admin dist path from multiple locations
 */
function resolveAdminDistPath(customPath?: string): string | null {
	// 1. Custom path from config
	if (customPath && existsSync(customPath)) {
		return resolve(customPath)
	}

	// 2. Environment variable
	const envPath = process.env.MAGNET_ADMIN_PATH
	if (envPath && existsSync(envPath)) {
		return resolve(envPath)
	}

	// 3. node_modules (traverse up to find it)
	let currentDir = process.cwd()
	while (currentDir !== resolve('/')) {
		const nodeModulesPath = join(
			currentDir,
			'node_modules',
			'@magnet-cms',
			'admin',
			'dist',
		)
		if (existsSync(nodeModulesPath)) {
			return nodeModulesPath
		}
		currentDir = resolve(currentDir, '..')
	}

	// 4. Monorepo paths (development)
	const monorepoPatterns = [
		join(process.cwd(), '..', '..', 'packages', 'client', 'admin', 'dist'),
		join(
			process.cwd(),
			'..',
			'..',
			'..',
			'packages',
			'client',
			'admin',
			'dist',
		),
	]
	for (const pattern of monorepoPatterns) {
		if (existsSync(pattern)) {
			return resolve(pattern)
		}
	}

	return null
}

// Module-level state
let resolvedDistPath: string | null = null
let resolvedAdminPath = '/admin'
let cachedIndexHtml: string | null = null
let staticMiddleware: express.RequestHandler | null = null

@Injectable()
class AdminServeMiddleware implements NestMiddleware {
	use(req: Request, res: Response, next: NextFunction): void {
		if (!resolvedDistPath || !staticMiddleware) {
			next()
			return
		}

		const adminPrefix = resolvedAdminPath.replace(/\/$/, '')
		const originalUrl = req.url
		req.url = req.url.replace(new RegExp(`^${adminPrefix}`), '') || '/'

		staticMiddleware(req, res, () => {
			req.url = originalUrl
			const urlPath = req.url.replace(new RegExp(`^${adminPrefix}`), '') || '/'

			// File extension = missing static file = 404
			if (extname(urlPath)) {
				res.status(404).send('Not found')
				return
			}

			// SPA route - serve index.html
			if (!cachedIndexHtml && resolvedDistPath) {
				const indexPath = join(resolvedDistPath, 'index.html')
				if (existsSync(indexPath)) {
					cachedIndexHtml = readFileSync(indexPath, 'utf-8')
				}
			}

			if (cachedIndexHtml) {
				res.type('html').send(cachedIndexHtml)
			} else {
				res
					.status(404)
					.send('Admin panel not found. Build the admin package first.')
			}
		})
	}
}

@Module({})
export class AdminServeModule implements NestModule {
	private static readonly logger = new Logger(AdminServeModule.name)

	configure(consumer: MiddlewareConsumer): void {
		if (resolvedDistPath) {
			consumer.apply(AdminServeMiddleware).forRoutes(
				{ path: resolvedAdminPath.replace(/^\//, ''), method: 0 },
				{
					path: `${resolvedAdminPath.replace(/^\//, '')}/*splat`,
					method: 0,
				},
			)
		}
	}

	static forRoot(options: AdminServeOptions): DynamicModule | null {
		if (!options.enabled) {
			AdminServeModule.logger.log('Admin panel serving disabled')
			return null
		}

		resolvedAdminPath = options.path
		resolvedDistPath = resolveAdminDistPath(options.distPath)

		if (!resolvedDistPath) {
			AdminServeModule.logger.warn(
				'Admin dist not found. Admin UI will not be served. ' +
					'Run "bun run build" in @magnet-cms/admin to build it.',
			)
			return { module: AdminServeModule }
		}

		staticMiddleware = express.static(resolvedDistPath, {
			index: false,
			fallthrough: true,
		})

		AdminServeModule.logger.log(
			`Serving admin at ${options.path} from ${resolvedDistPath}`,
		)

		return {
			module: AdminServeModule,
			providers: [AdminServeMiddleware],
		}
	}
}
