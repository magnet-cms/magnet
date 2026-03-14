import type { AuthConfig } from '@magnet-cms/common'
import { MagnetModuleOptions } from '@magnet-cms/common'
import { DynamicModule, Module } from '@nestjs/common'
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import type { StringValue } from 'ms'
import { DatabaseModule } from '~/modules/database'
import { EventsModule } from '~/modules/events'
import { SettingsModule } from '~/modules/settings'
import { UserModule, UserService } from '~/modules/user'
import { AuthStrategyFactory } from './auth-strategy.factory'
import { AUTH_CONFIG, AUTH_STRATEGY } from './auth.constants'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { AuthSettings } from './auth.settings'
import { DynamicAuthGuard } from './guards/dynamic-auth.guard'
import { DynamicOAuthGuard } from './guards/dynamic-oauth.guard'
import {
	OAuthController,
	OAuthProviderInfoController,
} from './oauth.controller'
import { OAuthService } from './oauth.service'
import { LoginAttempt } from './schemas/login-attempt.schema'
import { PasswordReset } from './schemas/password-reset.schema'
import { RefreshToken } from './schemas/refresh-token.schema'
import { Session } from './schemas/session.schema'
import { PasswordResetService } from './services/password-reset.service'
import { JwtAuthStrategy } from './strategies/jwt-auth.strategy'

@Module({})
export class AuthModule {
	/**
	 * Register the auth module with configuration.
	 * Supports dynamic strategy registration via config.
	 *
	 * OAuth providers (Google, GitHub, Facebook, Discord) are configured entirely
	 * through the admin settings UI — no code-level credentials are required.
	 *
	 * @param authConfig - Auth configuration (optional, uses JWT by default)
	 *
	 * @example
	 * ```typescript
	 * // Default JWT strategy
	 * AuthModule.forRoot()
	 *
	 * // Custom JWT config
	 * AuthModule.forRoot({
	 *   strategy: 'jwt',
	 *   jwt: { secret: 'my-secret', expiresIn: '24h' }
	 * })
	 *
	 * // Custom strategy (register before module init)
	 * AuthStrategyFactory.registerStrategy('custom', CustomAuthStrategy)
	 * AuthModule.forRoot({ strategy: 'custom' })
	 * ```
	 */
	static forRoot(authConfig?: AuthConfig): DynamicModule {
		return {
			module: AuthModule,
			global: true,
			imports: [
				DatabaseModule,
				// Register auth schemas
				DatabaseModule.forFeature(RefreshToken),
				DatabaseModule.forFeature(Session),
				DatabaseModule.forFeature(LoginAttempt),
				DatabaseModule.forFeature(PasswordReset),
				UserModule,
				EventsModule,
				SettingsModule.forFeature(AuthSettings),
				// Use configured strategy as Passport default (falls back to 'jwt')
				PassportModule.register({
					defaultStrategy: authConfig?.strategy || 'jwt',
				}),
				JwtModule.registerAsync({
					useFactory: (options: MagnetModuleOptions): JwtModuleOptions => ({
						secret: authConfig?.jwt?.secret || options.jwt.secret,
						signOptions: {
							expiresIn: (authConfig?.jwt?.expiresIn || '7d') as StringValue,
						},
					}),
					inject: [MagnetModuleOptions],
				}),
			],
			controllers: [
				AuthController,
				OAuthController,
				OAuthProviderInfoController,
			],
			providers: [
				{
					provide: AUTH_CONFIG,
					useValue: authConfig || null,
				},
				{
					provide: AUTH_STRATEGY,
					useFactory: (
						options: MagnetModuleOptions,
						userService: UserService,
					) => {
						return AuthStrategyFactory.getStrategy(
							authConfig,
							userService,
							options.jwt.secret,
						)
					},
					inject: [MagnetModuleOptions, UserService],
				},
				// Always register JwtAuthStrategy for Passport 'jwt' strategy (used when strategy is 'jwt' or as fallback)
				// This ensures the 'jwt' passport strategy is available even when using custom auth strategies
				{
					provide: JwtAuthStrategy,
					useFactory: (
						options: MagnetModuleOptions,
						userService: UserService,
					) => {
						return new JwtAuthStrategy(
							{
								strategy: 'jwt',
								jwt: {
									secret: authConfig?.jwt?.secret || options.jwt.secret,
									expiresIn: authConfig?.jwt?.expiresIn || '7d',
								},
							},
							userService,
						)
					},
					inject: [MagnetModuleOptions, UserService],
				},
				OAuthService,
				DynamicOAuthGuard,
				{
					provide: DynamicAuthGuard,
					useFactory: () => {
						// Set strategy name on the class so all usages pick it up without DI
						DynamicAuthGuard.strategyName = authConfig?.strategy || 'jwt'
						return new DynamicAuthGuard()
					},
				},
				PasswordResetService,
				AuthService,
			],
			exports: [
				AuthService,
				OAuthService,
				AUTH_STRATEGY,
				DynamicAuthGuard,
				JwtModule,
				PassportModule,
			],
		}
	}
}
