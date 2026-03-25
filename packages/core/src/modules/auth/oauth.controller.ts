import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { Request, Response } from 'express'

import { AuthService } from './auth.service'
import { AuthSettings } from './auth.settings'
import { DynamicOAuthGuard } from './guards/dynamic-oauth.guard'
import type { OAuthProfile } from './strategies/google.strategy'

import { SettingsService } from '~/modules/settings'

interface OAuthRequest extends Request {
  user: OAuthProfile
}

/**
 * Handles OAuth provider initiation and callbacks via generic `:provider` routes.
 *
 * Flow:
 *  1. User clicks "Sign in with Google" → GET /auth/oauth/google
 *  2. DynamicOAuthGuard selects the "google" Passport strategy; Passport redirects
 *     to provider consent page (no response body returned from this controller)
 *  3. Provider redirects back → GET /auth/oauth/google/callback
 *  4. DynamicOAuthGuard validates the OAuth code via Passport; `req.user` is
 *     populated with the normalised OAuthProfile by the strategy's validate callback
 *  5. Controller calls AuthService.loginWithOAuthProfile() to issue JWT tokens
 *  6. Browser is redirected to `AuthSettings.oauthRedirectUrl` with tokens in
 *     query params, ready to be processed by the admin UI /auth/callback page
 *
 * Adding a new provider (e.g., Twitter) requires only:
 *  - Adding credential fields to AuthSettings (oauth_* sections)
 *  - Registering the strategy in OAuthService.registerStrategies()
 *  No controller changes are needed.
 */
@Controller('auth/oauth')
@UseGuards(ThrottlerGuard)
export class OAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Initiates the OAuth flow for the given provider.
   * DynamicOAuthGuard selects the matching Passport strategy and triggers the
   * provider redirect — the controller body never executes.
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get(':provider')
  @UseGuards(DynamicOAuthGuard)
  initiate(@Param('provider') _provider: string): void {
    // Passport handles the redirect — this body never executes
  }

  /**
   * OAuth callback for the given provider.
   * The provider redirects here with an authorization code. Passport exchanges
   * the code for tokens and populates `req.user` via the strategy's validate().
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get(':provider/callback')
  @UseGuards(DynamicOAuthGuard)
  async callback(
    @Param('provider') _provider: string,
    @Req() req: OAuthRequest,
    @Res() res: Response,
  ): Promise<void> {
    await this.handleOAuthCallback(req, res)
  }

  // ============================================================================
  // Internal
  // ============================================================================

  /**
   * Shared callback handler: find-or-create the user, issue JWT tokens, and
   * redirect the browser to the admin UI callback page with tokens in the URL.
   */
  private async handleOAuthCallback(req: OAuthRequest, res: Response): Promise<void> {
    const profile = req.user

    try {
      const user = await this.authService.findOrCreateOAuthUser(
        profile.provider,
        profile.id,
        profile.email,
        profile.name,
      )

      const context = {
        ipAddress: req.ip ?? req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
      }

      const tokens = await this.authService.loginWithOAuthProfile(user, context)

      const settings = await this.settingsService.get(AuthSettings)
      const redirectUrl = settings.oauthRedirectUrl || '/'

      const params = new URLSearchParams({
        access_token: tokens.access_token,
      })
      if (tokens.refresh_token) {
        params.set('refresh_token', tokens.refresh_token)
      }
      if (tokens.expires_in) {
        params.set('expires_in', String(tokens.expires_in))
      }

      res.redirect(`${redirectUrl}?${params.toString()}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OAuth login failed'
      res.redirect(`/?error=${encodeURIComponent(message)}`)
    }
  }
}

/**
 * Exposes the list of enabled OAuth providers.
 * Used by the admin UI to determine which provider buttons to render.
 */
@Controller('auth/oauth')
export class OAuthProviderInfoController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Returns the names of OAuth providers that are currently configured
   * (i.e., have credentials stored in AuthSettings).
   */
  @Get('providers')
  async getProviders(): Promise<{ providers: string[] }> {
    const providers = await this.authService.getEnabledOAuthProviders()
    return { providers }
  }
}
