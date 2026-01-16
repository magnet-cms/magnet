import { Module } from '@nestjs/common'
import { PlaygroundController } from './playground.controller'
import { PlaygroundService } from './playground.service'

/**
 * NestJS module for content-builder plugin backend
 *
 * This module provides the playground API endpoints for schema management.
 * The ContentBuilderPlugin class is registered separately via MagnetModule.forRoot().
 */
@Module({
	controllers: [PlaygroundController],
	providers: [PlaygroundService],
	exports: [PlaygroundService],
})
export class ContentBuilderModule {}
