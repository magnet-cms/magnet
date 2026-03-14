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
			name: 'oauth',
			label: 'OAuth Providers',
			icon: 'plug',
			description:
				'Enable or disable OAuth login providers. Credentials must be configured in MagnetModule.forRoot().',
			order: 5,
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

	// OAuth Providers
	@SettingField.Boolean({
		label: 'Enable Google Login',
		description:
			'Allow users to sign in with Google. Requires Google OAuth credentials in MagnetModule config.',
		default: false,
		section: 'oauth',
		order: 1,
	})
	enableGoogleOAuth = false

	@SettingField.Boolean({
		label: 'Enable GitHub Login',
		description:
			'Allow users to sign in with GitHub. Requires GitHub OAuth App credentials in MagnetModule config.',
		default: false,
		section: 'oauth',
		order: 2,
	})
	enableGithubOAuth = false

	/**
	 * URL to redirect the user after a successful OAuth login.
	 * Should point to the admin UI's /auth/callback path.
	 * @example 'https://myapp.com/admin/auth/callback'
	 */
	@SettingField.Text({
		label: 'OAuth Redirect URL',
		description:
			'Where to redirect after OAuth login completes. Should be your admin UI /auth/callback URL.',
		section: 'oauth',
		order: 3,
	})
	oauthRedirectUrl = ''
}
