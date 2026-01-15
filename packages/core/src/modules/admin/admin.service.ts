import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { InitialConfig } from '@magnet/common'
import { Injectable, Logger } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { DiscoveryService } from '../discovery/discovery.service'
import { SettingsService } from '../settings/settings.service'

@Injectable()
export class AdminService {
	private readonly logger = new Logger(AdminService.name)
	private readonly isDevelopment = process.env.NODE_ENV !== 'production'
	private readonly adminDistPath: string

	constructor(
		private readonly discoveryService: DiscoveryService,
		private readonly settingsService: SettingsService,
	) {
		// Try to find the admin dist folder
		// In production, it should be in node_modules/@magnet/admin/dist/client
		// Or copied to a custom location via MAGNET_ADMIN_PATH env var
		this.adminDistPath =
			process.env.MAGNET_ADMIN_PATH || this.findAdminDistPath()

		this.logger.log(
			`Admin mode: ${this.isDevelopment ? 'development (proxy)' : 'production (static)'}`,
		)
		if (!this.isDevelopment) {
			this.logger.log(`Admin dist path: ${this.adminDistPath}`)
		}
	}

	/**
	 * Find the admin dist folder by checking common locations
	 */
	private findAdminDistPath(): string {
		const possiblePaths = [
			// Monorepo development
			resolve(process.cwd(), '../../packages/client/admin/dist/client'),
			resolve(process.cwd(), '../packages/client/admin/dist/client'),
			// Installed as dependency
			resolve(process.cwd(), 'node_modules/@magnet/admin/dist/client'),
			// Custom build output
			resolve(process.cwd(), 'dist/admin'),
			resolve(process.cwd(), 'public/admin'),
		]

		for (const path of possiblePaths) {
			if (existsSync(path)) {
				return path
			}
		}

		// Default fallback
		return resolve(process.cwd(), 'node_modules/@magnet/admin/dist/client')
	}

	/**
	 * Check if we should use development proxy
	 */
	isDevMode(): boolean {
		return this.isDevelopment
	}

	/**
	 * Get the path to admin static files
	 */
	getAdminDistPath(): string {
		return this.adminDistPath
	}

	/**
	 * Check if admin static files exist
	 */
	hasAdminFiles(): boolean {
		return existsSync(join(this.adminDistPath, 'index.html'))
	}

	/**
	 * Create proxy to Vite dev server (development only)
	 */
	createProxyServer(req: Request, res: Response, next: NextFunction) {
		const proxy = createProxyMiddleware({
			target: 'http://localhost:3001',
			changeOrigin: true,
			ws: true,
			secure: false,
			followRedirects: true,
			pathRewrite: {
				'^/admin': '',
			},
			on: {
				proxyReq: (_, req) => {
					this.logger.debug(`Proxying request: ${req.method} ${req.url}`)
				},
				error: (err) => {
					this.logger.error(`Proxy error: ${err.message}`)
				},
			},
		})

		return proxy(req, res, next)
	}

	/**
	 * Serve static file from admin dist (production only)
	 */
	serveStaticFile(req: Request, res: Response) {
		// Remove /admin prefix from path
		let filePath = req.path.replace(/^\/admin\/?/, '') || 'index.html'

		// For SPA routing, serve index.html for non-asset requests
		if (!filePath.includes('.')) {
			filePath = 'index.html'
		}

		const fullPath = join(this.adminDistPath, filePath)

		if (existsSync(fullPath)) {
			return res.sendFile(fullPath)
		}

		// Fallback to index.html for SPA routing
		return res.sendFile(join(this.adminDistPath, 'index.html'))
	}

	async getInitialConfig(): Promise<InitialConfig> {
		const schemas = this.discoveryService.getAllDiscoveredSchemas()
		const settings = this.discoveryService.getAllDiscoveredSettingsSchemas()
		const overview = await this.settingsService.getSettingsByGroup('overview')

		const title = overview.find((setting) => setting.key === 'title')?.value
		const description = overview.find(
			(setting) => setting.key === 'description',
		)?.value

		const env =
			process.env.NODE_ENV === 'production' ? 'production' : 'development'

		return {
			title,
			description,
			env,
			schemas,
			settings,
		}
	}
}
