// ============================================================================
// Auth User Types
// ============================================================================

/**
 * Authenticated user returned from auth strategies
 */
export interface AuthUser {
	/** Unique user identifier */
	id: string
	/** User email address */
	email: string
	/** User role for authorization */
	role: string
	/** Optional additional user data */
	[key: string]: unknown
}

/**
 * Login credentials (strategy-specific)
 */
export interface LoginCredentials {
	email: string
	password: string
	[key: string]: unknown
}

/**
 * Registration data (strategy-specific)
 */
export interface RegisterData {
	email: string
	password: string
	name: string
	role?: string
	[key: string]: unknown
}

/**
 * Authentication result containing access token
 */
export interface AuthResult {
	access_token: string
	refresh_token?: string
	expires_in?: number
	token_type?: string
}

// ============================================================================
// Auth Configuration Types
// ============================================================================

/**
 * JWT-specific configuration
 */
export interface JwtAuthConfig {
	/** JWT secret key */
	secret: string
	/** Token expiration time (e.g., '7d', '1h') */
	expiresIn?: string
}

/**
 * Supabase-specific auth configuration
 */
export interface SupabaseAuthConfig {
	/** Supabase project URL */
	supabaseUrl: string
	/** Supabase anon/public key */
	supabaseKey: string
	/** Default role for new users */
	defaultRole?: string
}

/**
 * Auth configuration for MagnetModuleOptions
 */
export interface AuthConfig {
	/** Strategy name to use (default: 'jwt') */
	strategy?: string
	/** JWT-specific configuration */
	jwt?: JwtAuthConfig
	/** Supabase-specific configuration (when strategy: 'supabase') */
	supabaseUrl?: string
	/** Supabase anon/public key */
	supabaseKey?: string
	/** Supabase service role key (required for admin operations like listUsers) */
	supabaseServiceKey?: string
	/** Default role for new Supabase users */
	defaultRole?: string
	/** Allow extensible config for custom strategies */
	[key: string]: unknown
}

// ============================================================================
// Auth Strategy Abstract Class
// ============================================================================

/**
 * Abstract base class for authentication strategies.
 * Similar to StorageAdapter, custom strategies must extend this class.
 *
 * @example
 * ```typescript
 * export class SupabaseAuthStrategy extends AuthStrategy {
 *   readonly name = 'supabase'
 *
 *   async validate(payload: unknown): Promise<AuthUser | null> {
 *     // Validate Supabase JWT token
 *   }
 *
 *   async login(credentials: LoginCredentials): Promise<AuthResult> {
 *     // Authenticate with Supabase
 *   }
 *
 *   async register(data: RegisterData): Promise<AuthUser> {
 *     // Register user in Supabase
 *   }
 *
 *   async validateCredentials(email: string, password: string): Promise<AuthUser | null> {
 *     // Validate user credentials
 *   }
 * }
 * ```
 */
export abstract class AuthStrategy {
	/**
	 * Unique identifier for this strategy
	 */
	abstract readonly name: string

	/**
	 * Initialize the auth strategy (optional setup)
	 */
	async initialize?(): Promise<void>

	/**
	 * Validate a token/payload and return the authenticated user
	 * @param payload - Strategy-specific payload (e.g., JWT payload, session data)
	 * @returns Authenticated user or null if invalid
	 */
	abstract validate(payload: unknown): Promise<AuthUser | null>

	/**
	 * Authenticate user with credentials and return tokens
	 * @param credentials - Login credentials (strategy-specific)
	 * @returns Authentication result with access token
	 */
	abstract login(credentials: LoginCredentials): Promise<AuthResult>

	/**
	 * Register a new user
	 * @param data - Registration data
	 * @returns The created user
	 */
	abstract register(data: RegisterData): Promise<AuthUser>

	/**
	 * Validate user credentials (used internally by login)
	 * @param email - User email
	 * @param password - User password
	 * @returns User if valid, null otherwise
	 */
	abstract validateCredentials(
		email: string,
		password: string,
	): Promise<AuthUser | null>

	/**
	 * Refresh an access token (optional)
	 * @param refreshToken - The refresh token
	 * @returns New authentication result
	 */
	async refresh?(refreshToken: string): Promise<AuthResult>

	/**
	 * Logout/invalidate tokens (optional)
	 * @param token - The token to invalidate
	 */
	async logout?(token: string): Promise<void>

	/**
	 * Check if any users exist in the system (optional)
	 * Strategies that manage their own user storage should implement this.
	 * If not implemented, AuthService will fall back to checking the local database.
	 * @returns true if users exist, false otherwise
	 */
	async hasUsers?(): Promise<boolean>

	/**
	 * Get the Passport strategy name (for guards)
	 * Returns the name to use with AuthGuard()
	 */
	getPassportStrategyName(): string {
		return this.name
	}
}
