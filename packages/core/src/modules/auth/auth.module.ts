import type { AuthConfig } from '@magnet-cms/common'
import { MagnetModuleOptions } from '@magnet-cms/common'
import type { ExecutionContext } from '@nestjs/common'
import { DynamicModule, Module } from '@nestjs/common'
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ThrottlerModule } from '@nestjs/throttler'
import type { Request } from 'express'
import type { StringValue } from 'ms'

import { AuthStrategyFactory } from './auth-strategy.factory'
import { AUTH_CONFIG, AUTH_STRATEGY } from './auth.constants'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { AuthSettings } from './auth.settings'
import { DynamicAuthGuard } from './guards/dynamic-auth.guard'
import { DynamicOAuthGuard } from './guards/dynamic-oauth.guard'
import { OAuthController, OAuthProviderInfoController } from './oauth.controller'
import { OAuthService } from './oauth.service'
import { LoginAttempt } from './schemas/login-attempt.schema'
import { PasswordReset } from './schemas/password-reset.schema'
import { RefreshToken } from './schemas/refresh-token.schema'
import { Session } from './schemas/session.schema'
import { PasswordResetService } from './services/password-reset.service'
import { JwtAuthStrategy } from './strategies/jwt-auth.strategy'

import { DatabaseModule } from '~/modules/database'
import { EventsModule } from '~/modules/events'
import { SettingsModule } from '~/modules/settings'
import { UserModule, UserService } from '~/modules/user'

/**
 * When Playwright sends X-Magnet-E2E-Worker (unique per test), rate limits apply
 * per test bucket instead of per client IP. Parallel e2e runs no longer exhaust
 * a shared IP limit; production traffic is unchanged (header absent → IP only).
 */
function magnetAuthThrottlerTracker(
  req: Record<string, unknown>,
  _context: ExecutionContext,
): string {
  const r = req as unknown as Request
  const ip = r.ip ?? r.socket?.remoteAddress ?? 'unknown'
  const raw = r.headers['x-magnet-e2e-worker']
  const token = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined
  if (token && token.length > 0 && token.length <= 256) {
    return `${ip}:e2e:${token}`
  }
  return ip
}

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
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 10, name: 'default' }],
          getTracker: magnetAuthThrottlerTracker,
          skipIf: () => process.env.MAGNET_E2E_DISABLE_AUTH_THROTTLE === '1',
        }),
        DatabaseModule,
        // Register auth schemas
        DatabaseModule.forFeature(RefreshToken),
        DatabaseModule.forFeature(Session),
        DatabaseModule.forFeature(LoginAttempt),
        DatabaseModule.forFeature(PasswordReset),
        UserModule,
        EventsModule,
        SettingsModule.forFeature(AuthSettings),
        // Always use 'jwt' as the Passport strategy for request authentication.
        // Custom auth strategies (supabase, clerk) handle login/register
        // but JWT validation is still used for authenticating API requests.
        PassportModule.register({
          defaultStrategy: 'jwt',
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
      controllers: [AuthController, OAuthController, OAuthProviderInfoController],
      providers: [
        {
          provide: AUTH_CONFIG,
          useValue: authConfig || null,
        },
        {
          provide: AUTH_STRATEGY,
          useFactory: (options: MagnetModuleOptions, userService: UserService) => {
            return AuthStrategyFactory.getStrategy(authConfig, userService, options.jwt.secret)
          },
          inject: [MagnetModuleOptions, UserService],
        },
        // Always register JwtAuthStrategy for Passport 'jwt' strategy (used when strategy is 'jwt' or as fallback)
        // This ensures the 'jwt' passport strategy is available even when using custom auth strategies
        {
          provide: JwtAuthStrategy,
          useFactory: (options: MagnetModuleOptions, userService: UserService) => {
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
            // Always use 'jwt' Passport strategy for request authentication.
            // Custom strategies (supabase, clerk) handle login/register but
            // JWT validation is used for authenticating API requests.
            DynamicAuthGuard.strategyName = 'jwt'
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
        UserModule,
      ],
    }
  }
}
