import { Injectable, Logger } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'

@Injectable()
export class AdminService {
	private readonly logger = new Logger(AdminService.name)

	createProxyServer(req: Request, res: Response, next: NextFunction) {
		const proxy = createProxyMiddleware({
			target: 'http://localhost:3001',
			changeOrigin: true,
			ws: true, // Enable WebSocket support
			secure: false,
			followRedirects: true,
			pathRewrite: {
				// This handles the HMR path
				'^/admin/hmr': '/hmr',
			},
			on: {
				proxyReq: (proxyReq, req) => {
					this.logger.log(`Proxying request: ${req.method} ${req.url}`)
				},
				error: (err) => {
					this.logger.error(`Proxy error: ${err.message}`)
				},
			},
		})

		return proxy(req, res, next)
	}
}
