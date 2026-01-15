import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '~/modules/auth/guards/jwt-auth.guard'
import { EnvironmentService } from './environment.service'

@Controller('environments')
@UseGuards(JwtAuthGuard)
export class EnvironmentController {
	constructor(private readonly environmentService: EnvironmentService) {}

	@Get()
	async findAll() {
		return this.environmentService.findAll()
	}

	@Get('active')
	async getActive() {
		return this.environmentService.getActiveEnvironment()
	}

	@Post('test')
	async testConnection(@Body() body: { connectionString: string }) {
		const success = await this.environmentService.testConnection(
			body.connectionString,
		)
		return { success }
	}
}
