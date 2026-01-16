import { All, Controller, Get, Next, Req, Res } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { AdminService } from './admin.service'

@Controller()
export class AdminController {
	constructor(private readonly adminService: AdminService) {}

	@All('admin/*path')
	async handleAllRequests(
		@Req() req: Request,
		@Res() res: Response,
		@Next() next: NextFunction,
	) {
		return this.serveAdmin(req, res, next)
	}

	@Get('admin')
	async getAdminRoot(
		@Req() req: Request,
		@Res() res: Response,
		@Next() next: NextFunction,
	) {
		return this.serveAdmin(req, res, next)
	}

	private async serveAdmin(req: Request, res: Response, next: NextFunction) {
		// Development mode: proxy to Vite dev server
		if (this.adminService.isDevMode()) {
			try {
				await this.adminService.createProxyServer(req, res, next)
			} catch (error) {
				console.error('Admin proxy error:', error)
				return res
					.status(502)
					.send(
						'Admin panel is not available. Make sure the admin client is running on port 3001.',
					)
			}
			return
		}

		// Production mode: serve static files
		if (!this.adminService.hasAdminFiles()) {
			return res
				.status(404)
				.send(
					'Admin panel not found. Make sure @magnet-cms/admin is installed and built.',
				)
		}

		return this.adminService.serveStaticFile(req, res)
	}

	@Get('initial-config')
	async getInitialConfig(@Res() res: Response) {
		const config = await this.adminService.getInitialConfig()
		return res.send(config)
	}
}
