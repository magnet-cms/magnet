import { SettingField, Settings } from '@magnet-cms/common'

/**
 * Authentication settings schema.
 *
 * These settings control authentication behavior and password policies.
 *
 * @example
 * ```typescript
 * // In a service
 * const authConfig = await settingsService.get(AuthSettings)
 * if (password.length < authConfig.minPasswordLength) {
 *   throw new Error('Password too short')
 * }
 * ```
 */
@Settings({
	group: 'auth',
	label: 'Authentication',
	icon: 'shield',
	order: 5,
	description: 'Configure authentication behavior and password policies',
	sections: [
		{
			name: 'session',
			label: 'Session Settings',
			icon: 'clock',
			description: 'Configure how user sessions are managed',
			order: 1,
		},
		{
			name: 'password',
			label: 'Password Policy',
			icon: 'lock',
			description: 'Set requirements for user passwords',
			order: 2,
		},
		{
			name: 'security',
			label: 'Security',
			icon: 'shield-alert',
			description: 'Configure security measures and lockout policies',
			order: 3,
		},
		{
			name: 'registration',
			label: 'Registration',
			icon: 'user-plus',
			description: 'Control user registration settings',
			order: 4,
		},
		{
			name: 'oauth_general',
			label: 'OAuth Providers',
			icon: 'plug',
			description:
				'Configure OAuth login providers. A provider becomes active once its Client ID and Client Secret are saved.',
			order: 5,
		},
		{
			name: 'oauth_google',
			label: 'Google',
			icon: 'globe',
			description:
				'Sign in with Google. Create credentials at console.cloud.google.com → APIs & Services → Credentials.',
			order: 6,
		},
		{
			name: 'oauth_github',
			label: 'GitHub',
			icon: 'github',
			description:
				'Sign in with GitHub. Create an OAuth App at github.com → Settings → Developer settings → OAuth Apps.',
			order: 7,
		},
		{
			name: 'oauth_facebook',
			label: 'Facebook',
			icon: 'facebook',
			description:
				'Sign in with Facebook. Create an app at developers.facebook.com.',
			order: 8,
		},
		{
			name: 'oauth_discord',
			label: 'Discord',
			icon: 'message-circle',
			description:
				'Sign in with Discord. Create an application at discord.com/developers/applications.',
			order: 9,
		},
	],
})
export class AuthSettings {
	// Session Settings
	@SettingField.Number({
		label: 'Session Duration (hours)',
		description: 'How long user sessions remain valid',
		default: 24,
		section: 'session',
		order: 1,
	})
	sessionDuration = 24

	@SettingField.Number({
		label: 'Refresh Token Duration (days)',
		description: 'How long refresh tokens remain valid',
		default: 7,
		section: 'session',
		order: 2,
	})
	refreshTokenDuration = 7

	@SettingField.Boolean({
		label: 'Enable Session Management',
		description: 'Track and manage active user sessions',
		default: true,
		section: 'session',
		order: 3,
	})
	enableSessions = true

	@SettingField.Number({
		label: 'Max Concurrent Sessions',
		description:
			'Maximum number of simultaneous sessions per user (0 = unlimited)',
		default: 0,
		section: 'session',
		order: 4,
	})
	maxConcurrentSessions = 0

	// Password Policy
	@SettingField.Number({
		label: 'Minimum Password Length',
		description: 'Minimum number of characters required for passwords',
		default: 8,
		section: 'password',
		order: 1,
	})
	minPasswordLength = 8

	@SettingField.Boolean({
		label: 'Require Uppercase',
		description: 'Require at least one uppercase letter in passwords',
		default: true,
		section: 'password',
		order: 2,
	})
	requireUppercase = true

	@SettingField.Boolean({
		label: 'Require Number',
		description: 'Require at least one number in passwords',
		default: true,
		section: 'password',
		order: 3,
	})
	requireNumber = true

	@SettingField.Boolean({
		label: 'Require Special Character',
		description: 'Require at least one special character in passwords',
		default: false,
		section: 'password',
		order: 4,
	})
	requireSpecialChar = false

	// Security
	@SettingField.Number({
		label: 'Max Login Attempts',
		description: 'Maximum failed login attempts before account lockout',
		default: 5,
		section: 'security',
		order: 1,
	})
	maxLoginAttempts = 5

	@SettingField.Number({
		label: 'Lockout Duration (minutes)',
		description: 'How long accounts are locked after too many failed attempts',
		default: 15,
		section: 'security',
		order: 2,
	})
	lockoutDuration = 15

	// Registration
	@SettingField.Boolean({
		label: 'Allow Registration',
		description: 'Allow new users to register themselves',
		default: false,
		section: 'registration',
		order: 1,
	})
	allowRegistration = false

	@SettingField.Boolean({
		label: 'Require Email Verification',
		description: 'Require users to verify their email address',
		default: false,
		section: 'registration',
		order: 2,
	})
	requireEmailVerification = false

	// ============================================================================
	// OAuth General
	// ============================================================================

	/**
	 * Where to redirect the browser after a successful OAuth login.
	 * Should point to your admin UI's /auth/callback route.
	 * @example 'https://myapp.com/admin/auth/callback'
	 */
	@SettingField.Text({
		label: 'OAuth Redirect URL',
		description:
			'URL to redirect after OAuth login completes. Set this to your admin UI /auth/callback path.',
		section: 'oauth_general',
		order: 1,
	})
	oauthRedirectUrl = ''

	// ============================================================================
	// Google
	// ============================================================================

	@SettingField.Text({
		label: 'Client ID',
		description: 'Google OAuth 2.0 client ID',
		section: 'oauth_google',
		order: 1,
	})
	googleClientId = ''

	@SettingField.Text({
		label: 'Client Secret',
		description: 'Google OAuth 2.0 client secret',
		section: 'oauth_google',
		order: 2,
	})
	googleClientSecret = ''

	@SettingField.Text({
		label: 'Callback URL',
		description:
			'Must match the authorized redirect URI in Google Cloud Console. Example: https://myapp.com/auth/oauth/google/callback',
		section: 'oauth_google',
		order: 3,
	})
	googleCallbackURL = ''

	// ============================================================================
	// GitHub
	// ============================================================================

	@SettingField.Text({
		label: 'Client ID',
		description: 'GitHub OAuth App client ID',
		section: 'oauth_github',
		order: 1,
	})
	githubClientId = ''

	@SettingField.Text({
		label: 'Client Secret',
		description: 'GitHub OAuth App client secret',
		section: 'oauth_github',
		order: 2,
	})
	githubClientSecret = ''

	@SettingField.Text({
		label: 'Callback URL',
		description:
			'Must match the Authorization callback URL in your GitHub OAuth App. Example: https://myapp.com/auth/oauth/github/callback',
		section: 'oauth_github',
		order: 3,
	})
	githubCallbackURL = ''

	// ============================================================================
	// Facebook
	// ============================================================================

	@SettingField.Text({
		label: 'App ID',
		description: 'Facebook App ID from developers.facebook.com',
		section: 'oauth_facebook',
		order: 1,
	})
	facebookClientId = ''

	@SettingField.Text({
		label: 'App Secret',
		description: 'Facebook App Secret from developers.facebook.com',
		section: 'oauth_facebook',
		order: 2,
	})
	facebookClientSecret = ''

	@SettingField.Text({
		label: 'Callback URL',
		description:
			'Must match a valid OAuth Redirect URI in your Facebook App settings. Example: https://myapp.com/auth/oauth/facebook/callback',
		section: 'oauth_facebook',
		order: 3,
	})
	facebookCallbackURL = ''

	// ============================================================================
	// Discord
	// ============================================================================

	@SettingField.Text({
		label: 'Client ID',
		description: 'Discord application client ID from discord.com/developers',
		section: 'oauth_discord',
		order: 1,
	})
	discordClientId = ''

	@SettingField.Text({
		label: 'Client Secret',
		description:
			'Discord application client secret from discord.com/developers',
		section: 'oauth_discord',
		order: 2,
	})
	discordClientSecret = ''

	@SettingField.Text({
		label: 'Callback URL',
		description:
			'Must match a redirect URI registered in your Discord application. Example: https://myapp.com/auth/oauth/discord/callback',
		section: 'oauth_discord',
		order: 3,
	})
	discordCallbackURL = ''
}
