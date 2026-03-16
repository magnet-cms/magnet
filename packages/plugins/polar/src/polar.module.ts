import { Module } from '@nestjs/common'
import { PolarService } from './polar.service'

// TODO: Add schemas, controllers, and additional services

@Module({
	providers: [PolarService],
	exports: [PolarService],
})
export class PolarModule {}
