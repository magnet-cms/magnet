import { getSettingsOptions } from '@magnet-cms/common'
import { DynamicModule, Logger, Module, OnApplicationBootstrap, Type } from '@nestjs/common'

import { Setting } from './schemas/setting.schema'
import { SettingsController } from './settings.controller'
import { SettingsService } from './settings.service'

import { DatabaseModule } from '~/modules/database'

/**
 * Settings initializer service that registers settings with defaults on module init
 */
class SettingsInitializer implements OnApplicationBootstrap {
  private readonly logger = new Logger('SettingsInitializer')

  constructor(
    private readonly settingsService: SettingsService,
    private readonly schemas: Type[],
  ) {}

  async onApplicationBootstrap() {
    for (const schema of this.schemas) {
      const options = getSettingsOptions(schema)
      if (options) {
        this.logger.log(`Initializing settings for group: ${options.group}`)
        try {
          await this.settingsService.registerSettingsFromSchema(options.group, schema)
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error'
          // "already exists" is expected when settings were initialized in a prior run
          if (msg.includes('already exists') || msg.includes('duplicate key')) {
            this.logger.debug(`Settings for ${options.group} already initialized`)
          } else {
            this.logger.warn(`Failed to initialize settings for ${options.group}: ${msg}`)
          }
        }
      }
    }
  }
}

@Module({})
export class SettingsModule {
  static forRoot(): DynamicModule {
    return {
      module: SettingsModule,
      global: true,
      imports: [DatabaseModule, DatabaseModule.forFeature(Setting)],
      controllers: [SettingsController],
      providers: [SettingsService],
      exports: [SettingsService],
    }
  }

  static forFeature(schemas: Type | Type[]): DynamicModule {
    const schemaArray = Array.isArray(schemas) ? schemas : [schemas]

    // Register schemas as class providers for discovery service to find
    // Using useClass allows the discovery service to inspect the metatype
    const settingsRegistrations = schemaArray.map((schema: Type) => ({
      provide: `SETTINGS_SCHEMA_${schema.name.toUpperCase()}`,
      useClass: schema,
    }))

    // Create initializer provider that registers settings with defaults
    const initializerProvider = {
      provide: `SETTINGS_INITIALIZER_${schemaArray.map((s) => s.name).join('_')}`,
      useFactory: (settingsService: SettingsService) => {
        return new SettingsInitializer(settingsService, schemaArray)
      },
      inject: [SettingsService],
    }

    return {
      module: SettingsModule,
      providers: [...settingsRegistrations, initializerProvider],
      exports: [...settingsRegistrations],
    }
  }
}
