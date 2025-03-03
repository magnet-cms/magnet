import { Controller, Get, Res } from '@nestjs/common'
import type { Response } from 'express'
import { AdminService } from './admin.service'

@Controller()
export class AdminController {
	constructor(private readonly adminService: AdminService) {}

	// @All('admin/*')
	// async handleAllRequests(
	// 	@Req() req: Request,
	// 	@Res() res: Response,
	// 	@Next() next: NextFunction,
	// ) {
	// 	try {
	// 		await this.adminService.createProxyServer(req, res, next)
	// 	} catch (error) {
	// 		console.error('Admin proxy error:', error)
	// 		return res
	// 			.status(502)
	// 			.send(
	// 				'Admin panel is not available. Make sure the admin client is running on port 3001.',
	// 			)
	// 	}
	// }

	// @Get('admin')
	// async getAdmin(@Req() req: Request, @Res() res: Response) {
	// 	return res.redirect('/admin/')
	// }

	@Get('initial-config')
	async getInitialConfig(@Res() res: Response) {
		const config = await this.adminService.getInitialConfig()
		return res.send(config)
	}
}
