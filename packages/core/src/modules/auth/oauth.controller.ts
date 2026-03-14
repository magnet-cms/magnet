import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import type { Request, Response } from 'express'
import { SettingsService } from '~/modules/settings'
import { AuthService } from './auth.service'
import { AuthSettings } from './auth.settings'
import type { OAuthProfile } from './strategies/google.strategy'

interface OAuthRequest extends Request {
	user: OAuthProfile
}

/**
 * Handles OAuth provider initiation and callbacks for Google and GitHub.
 *
 * Flow:
 *  1. User clicks "Sign in with Google" → GET /auth/oauth/google
 *  2. Passport redirects to provider consent page (no response body returned)
 *  3. Provider redirects back → GET /auth/oauth/google/callback
 *  4. Passport validates code, calls strategy.validate(), attaches OAuthProfile to req.user
 *  5. Controller calls AuthService.loginWithOAuthProfile() to issue JWT
 *  6. Redirect to configured oauthRedirectUrl with tokens in query params
 */
@Controller('auth/oauth')
export class OAuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly settingsService: SettingsService,
	) {}

	// ============================================================================
	// Google
	// ============================================================================

	/**
	 * Initiates Google OAuth flow.
	 * Passport redirects the browser to Google's consent page.
	 */
	@Get('google')
	@UseGuards(AuthGuard('google'))
	initiateGoogle(): void {
		// Passport handles the redirect — this body never executes
	}

	/**
	 * Google OAuth callback.
	 * Google redirects here after user grants permission.
	 */
	@Get('google/callback')
	@UseGuards(AuthGuard('google'))
	async callbackGoogle(
		@Req() req: OAuthRequest,
		@Res() res: Response,
	): Promise<void> {
		await this.handleOAuthCallback(req, res)
	}

	// ============================================================================
	// GitHub
	// ============================================================================

	/**
	 * Initiates GitHub OAuth flow.
	 */
	@Get('github')
	@UseGuards(AuthGuard('github'))
	initiateGithub(): void {
		// Passport handles the redirect — this body never executes
	}

	/**
	 * GitHub OAuth callback.
	 */
	@Get('github/callback')
	@UseGuards(AuthGuard('github'))
	async callbackGithub(
		@Req() req: OAuthRequest,
		@Res() res: Response,
	): Promise<void> {
		await this.handleOAuthCallback(req, res)
	}

	// ============================================================================
	// Internal
	// ============================================================================

	/**
	 * Shared callback handler: find-or-create user, issue JWT, redirect to admin UI.
	 */
	private async handleOAuthCallback(
		req: OAuthRequest,
		res: Response,
	): Promise<void> {
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
			const message =
				error instanceof Error ? error.message : 'OAuth login failed'
			res.redirect(`/?error=${encodeURIComponent(message)}`)
		}
	}
}

/**
 * Dynamic route to initiate any configured OAuth provider by name.
 * Used internally by the admin UI to generate provider URLs.
 */
@Controller('auth/oauth')
export class OAuthProviderInfoController {
	constructor(
		private readonly authService: AuthService,
		private readonly settingsService: SettingsService,
	) {}

	/**
	 * Returns the list of enabled OAuth providers.
	 * Used by the admin UI to determine which provider buttons to show.
	 * This duplicates the data in GET /auth/status for convenience.
	 */
	@Get('providers')
	async getProviders(): Promise<{ providers: string[] }> {
		const providers = await this.authService.getEnabledOAuthProviders()
		return { providers }
	}
}
