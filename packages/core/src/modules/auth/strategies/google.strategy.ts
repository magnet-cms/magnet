import type { OAuthProviderConfig } from '@magnet-cms/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-google-oauth20'

export interface OAuthProfile {
	id: string
	email: string
	name: string
	provider: string
}

/**
 * Passport strategy for Google OAuth 2.0.
 *
 * Registered dynamically in AuthModule when Google credentials are present in config.
 * After Passport validates the OAuth token, the `validate()` result is attached to `req.user`
 * and consumed by the OAuth controller callback.
 */
export class GoogleOAuthStrategy extends PassportStrategy(Strategy, 'google') {
	constructor(config: OAuthProviderConfig) {
		super({
			clientID: config.clientId,
			clientSecret: config.clientSecret,
			callbackURL: config.callbackURL,
			scope: ['email', 'profile'],
		})
	}

	/**
	 * Called by Passport after Google validates the code exchange.
	 * We extract the profile details and pass them to the controller.
	 */
	validate(
		_accessToken: string,
		_refreshToken: string,
		profile: {
			id: string
			emails?: Array<{ value: string }>
			displayName?: string
		},
	): OAuthProfile {
		const email: string = profile.emails?.[0]?.value ?? ''
		return {
			id: profile.id,
			email,
			name: profile.displayName ?? email.split('@')[0] ?? '',
			provider: 'google',
		}
	}
}
