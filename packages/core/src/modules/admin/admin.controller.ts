import { All, Controller, Next, Req, Res } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { AdminService } from './admin.service'

@Controller('admin')
export class AdminController {
	constructor(private readonly adminService: AdminService) {}

	// Handle all admin routes with a single handler
	@All('*')
	async handleAllRequests(
		@Req() req: Request,
		@Res() res: Response,
		@Next() next: NextFunction,
	) {
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
	}
}
