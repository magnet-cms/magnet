import { MagnetModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'
import { Veterinarian } from './schemas/veterinarian.schema'
import { VeterinariansController } from './veterinarians.controller'
import { VeterinariansService } from './veterinarians.service'

@Module({
	imports: [MagnetModule.forFeature(Veterinarian)],
	controllers: [VeterinariansController],
	providers: [VeterinariansService],
	exports: [VeterinariansService],
})
export class VeterinariansModule {}
