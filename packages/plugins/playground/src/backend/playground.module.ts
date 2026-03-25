import { Module } from '@nestjs/common'

import { PlaygroundController } from './playground.controller'
import { PlaygroundService } from './playground.service'

/**
 * NestJS module for the Playground plugin backend (`playground` registry id).
 *
 * Exposes `/playground/*` API routes for schema management.
 * `PlaygroundPlugin` is registered separately via `MagnetModule.forRoot()`.
 */
@Module({
  controllers: [PlaygroundController],
  providers: [PlaygroundService],
  exports: [PlaygroundService],
})
export class PlaygroundModule {}
