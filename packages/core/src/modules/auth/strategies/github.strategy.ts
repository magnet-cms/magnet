import type { OAuthProviderConfig } from '@magnet-cms/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-github2'
import type { OAuthProfile } from './google.strategy'

/**
 * Passport strategy for GitHub OAuth 2.0.
 *
 * Registered dynamically in AuthModule when GitHub credentials are present in config.
 * After Passport validates the OAuth token, the `validate()` result is attached to `req.user`
 * and consumed by the OAuth controller callback.
 */
export class GithubOAuthStrategy extends PassportStrategy(Strategy, 'github') {
	constructor(config: OAuthProviderConfig) {
		super({
			clientID: config.clientId,
			clientSecret: config.clientSecret,
			callbackURL: config.callbackURL,
			scope: ['user:email'],
		})
	}

	/**
	 * Called by Passport after GitHub validates the code exchange.
	 * We extract the profile details and pass them to the controller.
	 */
	validate(
		_accessToken: string,
		_refreshToken: string,
		profile: {
			id: string
			emails?: Array<{ value: string }>
			displayName?: string
			username?: string
		},
	): OAuthProfile {
		const email: string = profile.emails?.[0]?.value ?? ''
		return {
			id: profile.id,
			email,
			name:
				profile.displayName ?? profile.username ?? email.split('@')[0] ?? '',
			provider: 'github',
		}
	}
}
