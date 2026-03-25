import { Module } from '@nestjs/common'
import { DiscoveryModule as NestDiscoveryModule } from '@nestjs/core'

import { DiscoveryController } from './discovery.controller'
import { DiscoveryService } from './discovery.service'
import { ControllerDiscoveryService } from './services/controller-discovery.service'
import { MetadataExtractorService } from './services/metadata-extractor.service'
import { MethodDiscoveryService } from './services/method-discovery.service'
import { SchemaDiscoveryService } from './services/schema-discovery.service'

@Module({
  imports: [NestDiscoveryModule],
  controllers: [DiscoveryController],
  providers: [
    DiscoveryService,
    ControllerDiscoveryService,
    MetadataExtractorService,
    MethodDiscoveryService,
    SchemaDiscoveryService,
  ],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
