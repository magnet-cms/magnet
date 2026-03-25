import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Injectable, NotFoundException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import type { Request } from 'express'

/**
 * DynamicOAuthGuard selects the correct Passport OAuth strategy at runtime by
 * reading the `:provider` route parameter from the incoming request.
 *
 * This eliminates the need for one guard/route per provider — a single generic
 * `/:provider` route works for all configured OAuth providers.
 *
 * If the named strategy is not registered in Passport (i.e., the provider's
 * credentials have not been saved to OAuthSettings), the guard throws a 404 so
 * the caller receives a clear "OAuth provider not configured" message.
 */
@Injectable()
export class DynamicOAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    const provider = request.params.provider

    if (!provider) {
      throw new NotFoundException('OAuth provider not specified')
    }

    const guard = new (AuthGuard(provider))({ session: false })
    try {
      return (await guard.canActivate(context)) as boolean
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unknown authentication strategy')) {
        throw new NotFoundException(
          `OAuth provider "${provider}" is not configured. Please add credentials in the admin settings panel.`,
        )
      }
      throw error
    }
  }
}
