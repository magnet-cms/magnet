import { MethodMetadata } from '@magnet-cms/common'
import { Controller, Get, Param } from '@nestjs/common'
import { RestrictedRoute } from '~/decorators/restricted.route'
import { DiscoveryService } from './discovery.service'

@Controller('discovery')
@RestrictedRoute()
export class DiscoveryController {
	constructor(private readonly discoveryService: DiscoveryService) {}

	@Get('schemas')
	getSchemas() {
		return this.discoveryService.getDiscoveredSchemas()
	}

	@Get('schemas/:name')
	getSchema(@Param('name') name: string) {
		return this.discoveryService.getDiscoveredSchema(name)
	}

	@Get('settings')
	getSettingsSchemas() {
		return this.discoveryService.getDiscoveredSettingsSchemas()
	}

	@Get('settings/:name')
	getSettingsSchema(@Param('name') name: string) {
		return this.discoveryService.getDiscoveredSettingsSchema(name)
	}

	@Get('controllers')
	getControllers() {
		return this.discoveryService.getDiscoveredControllers()
	}

	@Get('controllers/:name')
	getController(@Param('name') name: string) {
		return this.discoveryService.getDiscoveredController(name)
	}

	@Get('method/:path/:methodName')
	getMethodDetails(
		@Param('path') path: string,
		@Param('methodName') methodName: string,
	): MethodMetadata | { error: string } {
		return this.discoveryService.getMethodDetails(path, methodName)
	}
}
