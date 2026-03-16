import { MagnetModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'
import { Cat } from '../cats/schemas/cat.schema'
import { OwnerHooks } from './hooks/owner.hooks'
import { OwnersController } from './owners.controller'
import { OwnersService } from './owners.service'
import { Owner } from './schemas/owner.schema'

@Module({
	imports: [MagnetModule.forFeature([Owner, Cat])],
	controllers: [OwnersController],
	providers: [OwnersService, OwnerHooks],
	exports: [OwnersService],
})
export class OwnersModule {}
