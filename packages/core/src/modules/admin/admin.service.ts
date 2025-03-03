import { InitialConfig } from '@magnet/common'
import { Injectable, Logger } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { DiscoveryService } from '../discovery/discovery.service'
import { SettingsService } from '../settings/settings.service'

@Injectable()
export class AdminService {
	private readonly logger = new Logger(AdminService.name)

	constructor(
		private readonly discoveryService: DiscoveryService,
		private readonly settingsService: SettingsService,
	) {}

	createProxyServer(req: Request, res: Response, next: NextFunction) {
		const proxy = createProxyMiddleware({
			target: 'http://localhost:3001',
			changeOrigin: true,
			ws: true,
			secure: false,
			followRedirects: true,
			pathRewrite: {
				'^/admin/hmr': '/hmr',
			},
			on: {
				proxyReq: (_, req) => {
					this.logger.log(`Proxying request: ${req.method} ${req.url}`)
				},
				error: (err) => {
					this.logger.error(`Proxy error: ${err.message}`)
				},
			},
		})

		return proxy(req, res, next)
	}

	async getInitialConfig(): Promise<InitialConfig> {
		const schemas = this.discoveryService.getDiscoveredSchemas()
		const settings = this.discoveryService.getDiscoveredSettingsSchemas()
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
