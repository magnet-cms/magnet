// Minimal exports to avoid loading modules that use DatabaseModule.forFeature
// before MagnetModule.forRoot() runs. Other modules load lazily via magnet-module-imports.
export * from './magnet.module'
export * from './modules/database'
export * from './modules/discovery'
export * from './modules/events'
export * from './modules/health'
export * from './modules/logging'
export * from './decorators/restricted.route'
// Plugin decorators - no DB deps, safe to load before forRoot()
export {
	Plugin,
	type PluginDecoratorOptions,
} from './modules/plugin/decorators/plugin.decorator'
export { Hook } from './modules/plugin/decorators/hook.decorator'
export { InjectPluginOptions } from './modules/plugin/decorators/inject-plugin-options.decorator'
export { AuthStrategyFactory } from './modules/auth/auth-strategy.factory'
// Guards - no DB deps, safe to load before forRoot()
export { JwtAuthGuard } from './modules/auth/guards/auth.guard'
export { PermissionGuard } from './modules/rbac/guards/permission.guard'
// Service class references for adapter injection (class only, not module — no DB side-effects)
export { ContentService } from './modules/content/content.service'
export { EmailService } from './modules/email/email.service'
export { SettingsService } from './modules/settings/settings.service'
export { WebhookService } from './modules/webhook/webhook.service'
