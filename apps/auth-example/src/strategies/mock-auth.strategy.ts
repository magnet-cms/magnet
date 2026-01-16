import type {
	AuthConfig,
	AuthResult,
	AuthStrategy,
	AuthUser,
	LoginCredentials,
	RegisterData,
} from '@magnet/common'
import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { sign } from 'jsonwebtoken'

/**
 * Mock authentication strategy for demonstration purposes.
 *
 * This strategy shows how to implement a custom AuthStrategy.
 * It uses an in-memory user store and JWT tokens for simplicity.
 *
 * In a real-world scenario, you would:
 * - Connect to an external auth provider (Supabase, Auth0, Firebase, etc.)
 * - Use proper password hashing (bcrypt, argon2)
 * - Implement proper token validation
 *
 * @example
 * ```typescript
 * // Register the strategy before module initialization
 * import { AuthStrategyFactory } from '@magnet/core'
 * import { MockAuthStrategy } from './strategies/mock-auth.strategy'
 *
 * AuthStrategyFactory.registerStrategy('mock', MockAuthStrategy)
 *
 * // Configure Magnet to use the custom strategy
 * MagnetModule.forRoot({
 *   auth: {
 *     strategy: 'mock',
 *     mockSecret: 'your-mock-secret',
 *   },
 * })
 * ```
 */
export class MockAuthStrategy implements AuthStrategy {
	readonly name = 'mock'

	// In-memory user store for demonstration
	private users: Map<
		string,
		{ id: string; email: string; password: string; name: string; role: string }
	> = new Map()

	private readonly secret: string
	private readonly expiresIn: string

	constructor(
		config: AuthConfig,
		_userService: unknown, // Not used in this mock strategy
	) {
		// IMPORTANT: Use jwt.secret so tokens can be verified by JwtAuthGuard
		// Custom strategies must use the same secret as the Passport JWT strategy
		this.secret =
			config.jwt?.secret || (config.mockSecret as string) || 'mock-secret-key'
		this.expiresIn =
			(config.expiresIn as string) || config.jwt?.expiresIn || '7d'

		console.log('[MockAuthStrategy] Initialized with config:', {
			strategy: config.strategy,
			hasSecret: !!this.secret,
		})
	}

	/**
	 * Initialize the strategy (optional setup)
	 */
	async initialize(): Promise<void> {
		console.log('[MockAuthStrategy] Strategy initialized')
	}

	/**
	 * Validate a JWT payload and return the authenticated user
	 */
	async validate(
		payload: { sub: string; email: string; role: string } | unknown,
	): Promise<AuthUser | null> {
		console.log('[MockAuthStrategy] Validating payload:', payload)

		if (
			payload &&
			typeof payload === 'object' &&
			'sub' in payload &&
			'email' in payload
		) {
			const jwtPayload = payload as { sub: string; email: string; role: string }
			return {
				id: jwtPayload.sub,
				email: jwtPayload.email,
				role: jwtPayload.role || 'viewer',
			}
		}

		return null
	}

	/**
	 * Validate user credentials
	 */
	async validateCredentials(
		email: string,
		password: string,
	): Promise<AuthUser | null> {
		console.log('[MockAuthStrategy] Validating credentials for:', email)

		const user = this.users.get(email)
		if (!user) {
			console.log('[MockAuthStrategy] User not found')
			return null
		}

		// Simple password check (in real scenarios, use proper hashing)
		if (user.password !== password) {
			console.log('[MockAuthStrategy] Invalid password')
			return null
		}

		console.log('[MockAuthStrategy] Credentials valid')
		return {
			id: user.id,
			email: user.email,
			role: user.role,
		}
	}

	/**
	 * Authenticate and return JWT token
	 */
	async login(credentials: LoginCredentials): Promise<AuthResult> {
		console.log('[MockAuthStrategy] Login attempt for:', credentials.email)

		const user = await this.validateCredentials(
			credentials.email,
			credentials.password,
		)

		if (!user) {
			throw new UnauthorizedException('Invalid credentials')
		}

		const payload = { sub: user.id, email: user.email, role: user.role }
		const token = sign(payload, this.secret, { expiresIn: this.expiresIn })

		console.log('[MockAuthStrategy] Login successful, token generated')

		return {
			access_token: token,
			token_type: 'Bearer',
		}
	}

	/**
	 * Register a new user
	 */
	async register(data: RegisterData): Promise<AuthUser> {
		console.log('[MockAuthStrategy] Register attempt for:', data.email)

		// Check if user already exists
		if (this.users.has(data.email)) {
			throw new ConflictException('Email already in use')
		}

		// Create new user
		const userId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
		const newUser = {
			id: userId,
			email: data.email,
			password: data.password, // In real scenarios, hash this!
			name: data.name,
			role: data.role || 'viewer',
		}

		this.users.set(data.email, newUser)

		console.log('[MockAuthStrategy] User registered:', userId)

		return {
			id: newUser.id,
			email: newUser.email,
			role: newUser.role,
		}
	}

	/**
	 * Get the Passport strategy name for guards
	 */
	getPassportStrategyName(): string {
		// Use JWT strategy name since we're generating JWT tokens
		return 'jwt'
	}
}
