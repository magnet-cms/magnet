import {
	AuthConfig,
	AuthResult,
	AuthStrategy,
	AuthUser,
	LoginCredentials,
	RegisterData,
} from '@magnet-cms/common'
import { SupabaseClient, createClient } from '@supabase/supabase-js'

/**
 * Supabase-specific auth configuration
 */
export interface SupabaseAuthConfig extends AuthConfig {
	/** Supabase project URL */
	supabaseUrl: string
	/** Supabase anon/public key */
	supabaseKey: string
	/** Supabase service role key (required for admin operations like listUsers) */
	supabaseServiceKey?: string
	/** Default role for new users */
	defaultRole?: string
}

/**
 * Supabase authentication strategy for Magnet CMS.
 * Uses Supabase Auth for user authentication and token management.
 *
 * @example
 * ```typescript
 * import { AuthStrategyFactory } from '@magnet-cms/core'
 * import { SupabaseAuthStrategy } from '@magnet-cms/adapter-supabase'
 *
 * AuthStrategyFactory.registerStrategy('supabase', SupabaseAuthStrategy)
 *
 * MagnetModule.forRoot({
 *   auth: {
 *     strategy: 'supabase',
 *     supabaseUrl: process.env.SUPABASE_URL,
 *     supabaseKey: process.env.SUPABASE_ANON_KEY,
 *     jwt: { secret: process.env.SUPABASE_JWT_SECRET },
 *   },
 * })
 * ```
 */
export class SupabaseAuthStrategy extends AuthStrategy {
	readonly name = 'supabase'
	private supabase: SupabaseClient
	private supabaseAdmin: SupabaseClient | null = null
	private config: SupabaseAuthConfig

	constructor(config: AuthConfig, _userService: unknown) {
		super()
		this.config = config as SupabaseAuthConfig

		if (!this.config.supabaseUrl || !this.config.supabaseKey) {
			throw new Error(
				'Supabase auth requires supabaseUrl and supabaseKey in config',
			)
		}

		this.supabase = createClient(
			this.config.supabaseUrl,
			this.config.supabaseKey,
		)

		// Create admin client for service role operations if service key is provided
		if (this.config.supabaseServiceKey) {
			this.supabaseAdmin = createClient(
				this.config.supabaseUrl,
				this.config.supabaseServiceKey,
			)
		}
	}

	/**
	 * Validate a Supabase JWT payload and return the authenticated user.
	 * Called by Passport JWT strategy after token verification.
	 */
	async validate(payload: unknown): Promise<AuthUser | null> {
		const jwtPayload = payload as {
			sub?: string
			email?: string
			role?: string
		}

		if (!jwtPayload?.sub) {
			return null
		}

		// Get user from Supabase to ensure they still exist and get latest data
		const { data: userData, error } =
			await this.supabase.auth.admin.getUserById(jwtPayload.sub)

		if (error || !userData.user) {
			return null
		}

		return {
			id: userData.user.id,
			email: userData.user.email || '',
			role:
				userData.user.user_metadata?.role || this.config.defaultRole || 'user',
			name: userData.user.user_metadata?.name,
		}
	}

	/**
	 * Authenticate user with email and password via Supabase Auth.
	 */
	async login(credentials: LoginCredentials): Promise<AuthResult> {
		const { data, error } = await this.supabase.auth.signInWithPassword({
			email: credentials.email,
			password: credentials.password,
		})

		if (error) {
			throw new Error(error.message)
		}

		if (!data.session) {
			throw new Error('Login failed: no session returned')
		}

		return {
			access_token: data.session.access_token,
			refresh_token: data.session.refresh_token,
			expires_in: data.session.expires_in,
			token_type: 'Bearer',
		}
	}

	/**
	 * Register a new user in Supabase Auth.
	 */
	async register(data: RegisterData): Promise<AuthUser> {
		const { data: authData, error } = await this.supabase.auth.signUp({
			email: data.email,
			password: data.password,
			options: {
				data: {
					name: data.name,
					role: data.role || this.config.defaultRole || 'user',
				},
			},
		})

		if (error) {
			throw new Error(error.message)
		}

		if (!authData.user) {
			throw new Error('Registration failed: no user returned')
		}

		return {
			id: authData.user.id,
			email: authData.user.email || '',
			role:
				authData.user.user_metadata?.role || this.config.defaultRole || 'user',
			name: authData.user.user_metadata?.name,
		}
	}

	/**
	 * Validate user credentials (used internally).
	 */
	async validateCredentials(
		email: string,
		password: string,
	): Promise<AuthUser | null> {
		const { data, error } = await this.supabase.auth.signInWithPassword({
			email,
			password,
		})

		if (error || !data.user) {
			return null
		}

		return {
			id: data.user.id,
			email: data.user.email || '',
			role: data.user.user_metadata?.role || this.config.defaultRole || 'user',
			name: data.user.user_metadata?.name,
		}
	}

	/**
	 * Refresh an access token using a refresh token.
	 */
	async refresh(refreshToken: string): Promise<AuthResult> {
		const { data, error } = await this.supabase.auth.refreshSession({
			refresh_token: refreshToken,
		})

		if (error) {
			throw new Error(error.message)
		}

		if (!data.session) {
			throw new Error('Token refresh failed: no session returned')
		}

		return {
			access_token: data.session.access_token,
			refresh_token: data.session.refresh_token,
			expires_in: data.session.expires_in,
			token_type: 'Bearer',
		}
	}

	/**
	 * Logout/invalidate the current session.
	 */
	async logout(_token: string): Promise<void> {
		await this.supabase.auth.signOut()
	}

	/**
	 * Get the Supabase client for advanced usage.
	 */
	getSupabaseClient(): SupabaseClient {
		return this.supabase
	}

	/**
	 * Check if any users exist in Supabase Auth.
	 * Required by AuthService.exists() to determine if setup is needed.
	 */
	async hasUsers(): Promise<boolean> {
		if (!this.supabaseAdmin) {
			// If service key not configured, can't check users
			// Return false to allow fallback to database check
			return false
		}

		try {
			const users = await this.listUsers({ page: 1, perPage: 1 })
			return users.length > 0
		} catch {
			// If listUsers fails, return false to allow fallback
			return false
		}
	}

	/**
	 * List all users from Supabase Auth.
	 * Requires service role key to be configured.
	 */
	async listUsers(options?: { page?: number; perPage?: number }): Promise<
		AuthUser[]
	> {
		if (!this.supabaseAdmin) {
			throw new Error(
				'listUsers requires supabaseServiceKey to be configured. Add supabaseServiceKey to your auth config.',
			)
		}

		const { data, error } = await this.supabaseAdmin.auth.admin.listUsers({
			page: options?.page || 1,
			perPage: options?.perPage || 1000,
		})

		if (error) {
			throw new Error(`Failed to list users: ${error.message}`)
		}

		return (data?.users || []).map((user) => ({
			id: user.id,
			email: user.email || '',
			role: user.user_metadata?.role || this.config.defaultRole || 'user',
			name: user.user_metadata?.name,
		}))
	}
}
