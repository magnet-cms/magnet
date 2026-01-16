import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '~/modules/auth/guards/jwt-auth.guard'
import { EnvironmentService } from './environment.service'

@Controller('environments')
@UseGuards(JwtAuthGuard)
export class EnvironmentController {
	constructor(private readonly environmentService: EnvironmentService) {}

	/**
	 * Get all environments including the local environment from server config
	 */
	@Get()
	async findAll() {
		return this.environmentService.findAll()
	}

	/**
	 * Get the local environment info (connection string from env vars)
	 */
	@Get('local')
	getLocal() {
		return this.environmentService.getLocalEnvironment()
	}
}
