import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/**
 * DynamicAuthGuard selects the correct Passport strategy at runtime based on
 * the configured auth strategy in MagnetModule.forRoot({ auth: { strategy } }).
 *
 * This replaces the hardcoded JwtAuthGuard('jwt') and supports any registered
 * Passport strategy (e.g., 'jwt', 'clerk').
 *
 * The strategy name is stored as a static property, set once during AuthModule
 * initialization, so this guard can be used in any module without requiring
 * AUTH_CONFIG to be in scope.
 *
 * @example
 * ```typescript
 * // In a controller:
 * @UseGuards(DynamicAuthGuard)
 * @Get('protected')
 * async protectedRoute(@Req() req) { ... }
 * ```
 */
@Injectable()
export class DynamicAuthGuard implements CanActivate {
  /** Set by AuthModule.forRoot() during initialization. Defaults to 'jwt'. */
  static strategyName = 'jwt'

  canActivate(context: ExecutionContext): Promise<boolean> | boolean {
    const guard = new (AuthGuard(DynamicAuthGuard.strategyName))()
    return guard.canActivate(context) as Promise<boolean> | boolean
  }
}

/**
 * OptionalDynamicAuthGuard populates req.user when a valid token is present
 * but allows the request through even without authentication.
 *
 * Use this for endpoints that behave differently when authenticated
 * (e.g., /auth/status returns onboardingCompleted only for authenticated users).
 */
@Injectable()
export class OptionalDynamicAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const guard = new (AuthGuard(DynamicAuthGuard.strategyName))()
    try {
      await guard.canActivate(context)
    } catch {
      // Authentication failed — allow request through without req.user
    }
    return true
  }
}
