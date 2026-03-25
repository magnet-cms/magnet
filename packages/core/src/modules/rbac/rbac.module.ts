import type { RBACModuleOptions } from '@magnet-cms/common'
import { DynamicModule, Module, forwardRef } from '@nestjs/common'

import { PermissionGuard } from './guards/permission.guard'
import { DynamicPermissionInterceptor } from './interceptors/dynamic-permission.interceptor'
import { RBAC_CONFIG } from './rbac.constants'
import { RBACController } from './rbac.controller'
import { RBACSettings } from './rbac.settings'
import { Permission } from './schemas/permission.schema'
import { Role } from './schemas/role.schema'
import { PermissionDiscoveryService } from './services/permission-discovery.service'
import { PermissionService } from './services/permission.service'
import { RoleService } from './services/role.service'

import { DatabaseModule } from '~/modules/database'
import { DiscoveryModule } from '~/modules/discovery'
import { EventsModule } from '~/modules/events'
import { SettingsModule } from '~/modules/settings'
import { UserModule } from '~/modules/user'

/**
 * RBAC (Role-Based Access Control) Module
 *
 * Provides role and permission management:
 * - Role CRUD operations
 * - Permission discovery from schemas, controllers, and plugins
 * - Permission checking for routes
 * - Settings integration
 *
 * @example
 * ```typescript
 * // In MagnetModule configuration
 * RBACModule.forRoot({
 *   enabled: true,
 *   defaultRole: 'authenticated',
 *   cachePermissions: true,
 * })
 * ```
 */
@Module({})
export class RBACModule {
  /**
   * Register the RBAC module with configuration
   *
   * @param options - RBAC configuration options
   */
  static forRoot(options?: RBACModuleOptions): DynamicModule {
    return {
      module: RBACModule,
      global: true,
      imports: [
        DatabaseModule,
        DatabaseModule.forFeature(Role),
        DatabaseModule.forFeature(Permission),
        forwardRef(() => UserModule),
        EventsModule,
        DiscoveryModule,
        // PluginModule is globally available from MagnetModule.forRoot()
        SettingsModule.forFeature(RBACSettings),
      ],
      controllers: [RBACController],
      providers: [
        {
          provide: RBAC_CONFIG,
          useValue: options ?? {},
        },
        PermissionDiscoveryService,
        PermissionService,
        RoleService,
        PermissionGuard,
        DynamicPermissionInterceptor,
      ],
      exports: [
        RoleService,
        PermissionDiscoveryService,
        PermissionService,
        PermissionGuard,
        DynamicPermissionInterceptor,
      ],
    }
  }
}
