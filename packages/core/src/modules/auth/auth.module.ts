import type { AuthConfig } from '@magnet-cms/common'
import { MagnetModuleOptions } from '@magnet-cms/common'
import { DynamicModule, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { DatabaseModule } from '~/modules/database'
import { UserModule, UserService } from '~/modules/user'
import { AuthStrategyFactory } from './auth-strategy.factory'
import { AUTH_CONFIG, AUTH_STRATEGY } from './auth.constants'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtAuthStrategy } from './strategies/jwt-auth.strategy'

@Module({})
export class AuthModule {
	/**
	 * Register the auth module with configuration.
	 * Supports dynamic strategy registration via config.
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
		const strategyName = authConfig?.strategy || 'jwt'

		return {
			module: AuthModule,
			global: true,
			imports: [
				DatabaseModule,
				UserModule,
				// Always use 'jwt' as default strategy for guards (JwtAuthGuard)
				PassportModule.register({ defaultStrategy: 'jwt' }),
				JwtModule.registerAsync({
					useFactory: (options: MagnetModuleOptions) => ({
						secret: authConfig?.jwt?.secret || options.jwt.secret,
						signOptions: { expiresIn: authConfig?.jwt?.expiresIn || '7d' },
					}),
					inject: [MagnetModuleOptions],
				}),
			],
			controllers: [AuthController],
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
				// Always register JwtAuthStrategy for Passport integration (required for JwtAuthGuard)
				// This ensures the 'jwt' passport strategy is available even when using custom auth strategies
				{
					provide: JwtAuthStrategy,
					useFactory: (
						options: MagnetModuleOptions,
						userService: UserService,
					) => {
						// Create a JwtAuthStrategy for Passport integration
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
				AuthService,
			],
			exports: [AuthService, AUTH_STRATEGY, JwtModule, PassportModule],
		}
	}
}
