import { Module, forwardRef } from '@nestjs/common'
import { DiscoveryModule } from '../discovery/discovery.module'
import { SettingsModule } from '../settings/settings.module'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'

@Module({
	imports: [
		forwardRef(() => DiscoveryModule),
		forwardRef(() => SettingsModule),
	],
	controllers: [AdminController],
	providers: [AdminService],
})
export class AdminModule {}
