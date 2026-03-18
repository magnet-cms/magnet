import { createHash, randomBytes } from 'node:crypto'
import type {
	AuthResult,
	AuthStrategy,
	AuthUser,
	ExternalAuthInfo,
} from '@magnet-cms/common'
import {
	DuplicateKeyError,
	InjectModel,
	InvalidCredentialsError,
	Model,
	UserNotFoundError,
} from '@magnet-cms/common'
import type { AuthConfig } from '@magnet-cms/common'
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { compare, hash } from 'bcryptjs'
import { EventService } from '~/modules/events'
import { MagnetLogger } from '~/modules/logging/logger.service'
import { SettingsService } from '~/modules/settings'
import { UserService } from '~/modules/user'
import { AUTH_CONFIG, AUTH_STRATEGY } from './auth.constants'
import { AuthSettings } from './auth.settings'
import { ChangePasswordDto } from './dto/change-password.dto'
import { RegisterDTO } from './dto/register.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { OAuthService } from './oauth.service'
import type { LoginFailureReason } from './schemas/login-attempt.schema'
import { LoginAttempt } from './schemas/login-attempt.schema'
import { RefreshToken } from './schemas/refresh-token.schema'
import type { DeviceType } from './schemas/session.schema'
import { Session } from './schemas/session.schema'
import {
	PasswordResetRequestResult,
	PasswordResetService,
} from './services/password-reset.service'

/**
 * Request context for authentication operations
 */
export interface RequestContext {
	ipAddress?: string
	userAgent?: string
}

/**
 * Password validation result
 */
export interface PasswordValidationResult {
	valid: boolean
	errors: string[]
}

/**
 * Session information returned to clients
 */
export interface SessionInfo {
	sessionId: string
	deviceName?: string
	deviceType?: DeviceType
	browser?: string
	os?: string
	ipAddress?: string
	location?: string
	createdAt: Date
	lastActivityAt?: Date
	current: boolean
}

/**
 * Enhanced authentication service with refresh tokens, sessions, and security features.
 *
 * Features:
 * - Refresh token management with rotation
 * - Session tracking with device info
 * - Account lockout after failed attempts
 * - Password policy validation
 * - Event emission for auth events
 */
@Injectable()
export class AuthService {
	constructor(
		private userService: UserService,
		private settingsService: SettingsService,
		private eventService: EventService,
		private passwordResetService: PasswordResetService,
		private jwtService: JwtService,
		@Inject(AUTH_STRATEGY) private readonly authStrategy: AuthStrategy,
		@Inject(AUTH_CONFIG) private readonly authConfig: AuthConfig | null,
		@InjectModel(RefreshToken)
		private readonly refreshTokenModel: Model<RefreshToken>,
		@InjectModel(Session) private readonly sessionModel: Model<Session>,
		@InjectModel(LoginAttempt)
		private readonly loginAttemptModel: Model<LoginAttempt>,
		private readonly logger: MagnetLogger,
		private readonly oauthService: OAuthService,
	) {
		this.logger.setContext(AuthService.name)
	}

	// ============================================================================
	// Core Authentication
	// ============================================================================

	/**
	 * Register a new user via the configured auth strategy
	 */
	async register(registerDto: RegisterDTO): Promise<AuthUser> {
		// Validate password against policy
		const validation = await this.validatePasswordPolicy(registerDto.password)
		if (!validation.valid) {
			throw new InvalidCredentialsError(validation.errors.join(', '))
		}

		// First user always gets admin role regardless of requested role
		const isFirstUser = !(await this.exists())
		const role = isFirstUser ? 'admin' : registerDto.role

		const user = await this.authStrategy.register({
			email: registerDto.email,
			password: registerDto.password,
			name: registerDto.name,
			role,
		})

		// Ensure a local user record exists for external auth strategies
		// (e.g., Supabase, Clerk) that create users in an external system
		// but don't create local database records.
		const existingLocal = await this.userService.findOne({ email: user.email })
		if (!existingLocal) {
			const name = typeof user.name === 'string' ? user.name : registerDto.name
			const roleValue = typeof user.role === 'string' ? user.role : role
			await this.userService.create({
				id: user.id,
				email: user.email,
				name,
				role: roleValue,
			})
		}

		await this.emitEvent('user.registered', {
			userId: user.id,
			email: registerDto.email,
			name: registerDto.name,
		})

		return user
	}

	/**
	 * Login with credentials and return tokens
	 */
	async login(
		credentials: { email: string; password: string },
		context: RequestContext = {},
	): Promise<AuthResult> {
		const settings = await this.settingsService.get(AuthSettings)

		// Check if account is locked
		const isLocked = await this.isAccountLocked(credentials.email, settings)
		if (isLocked) {
			await this.logLoginAttempt(
				credentials.email,
				false,
				'account_locked',
				context,
			)
			throw new UnauthorizedException(
				'Account temporarily locked. Please try again later.',
			)
		}

		// Validate credentials
		const user = await this.authStrategy.validateCredentials(
			credentials.email,
			credentials.password,
		)

		if (!user) {
			await this.logLoginAttempt(
				credentials.email,
				false,
				'invalid_password',
				context,
			)
			throw new UnauthorizedException('Invalid credentials')
		}

		// Check email verification if required
		if (settings.requireEmailVerification) {
			const fullUser = await this.userService.findOneById(user.id)
			if (fullUser && 'emailVerified' in fullUser && !fullUser.emailVerified) {
				await this.logLoginAttempt(
					credentials.email,
					false,
					'email_not_verified',
					context,
				)
				throw new UnauthorizedException('Please verify your email first')
			}
		}

		// Resolve local user ID — external auth strategies (Supabase, Clerk)
		// may return a provider-specific ID that doesn't match the local database.
		const localUser = await this.userService.findOne({ email: user.email })
		const effectiveUserId = localUser?.id || user.id

		// Check concurrent sessions if enabled
		if (settings.enableSessions && settings.maxConcurrentSessions > 0) {
			await this.enforceConcurrentSessionLimit(
				effectiveUserId,
				settings.maxConcurrentSessions,
			)
		}

		// Get tokens from strategy
		const authResult = await this.authStrategy.login(credentials)

		// Create refresh token
		const refreshTokenData = await this.createRefreshToken(
			effectiveUserId,
			settings.refreshTokenDuration,
			context,
		)

		// Create session if enabled
		let sessionId: string | undefined
		if (settings.enableSessions) {
			const session = await this.createSession(
				effectiveUserId,
				refreshTokenData.id,
				context,
				settings,
			)
			sessionId = session.sessionId
		}

		// Log successful login and update lastLogin timestamp
		await this.logLoginAttempt(credentials.email, true, null, context)
		try {
			await this.userService.update(effectiveUserId, {
				lastLogin: new Date(),
			})
		} catch {
			// User may not have a local record yet (external auth)
		}
		await this.emitEvent('user.login', { userId: effectiveUserId, sessionId })

		return {
			...authResult,
			refresh_token: refreshTokenData.plainToken,
			expires_in: settings.sessionDuration * 3600,
			token_type: 'Bearer',
		}
	}

	/**
	 * Refresh access token using a valid refresh token
	 */
	async refresh(
		refreshToken: string,
		context: RequestContext = {},
	): Promise<AuthResult> {
		const settings = await this.settingsService.get(AuthSettings)

		// Validate refresh token
		const tokenHash = this.hashToken(refreshToken)
		const storedToken = await this.refreshTokenModel.findOne({
			token: tokenHash,
			revoked: false,
		})

		if (!storedToken) {
			throw new UnauthorizedException('Invalid refresh token')
		}

		if (new Date() > storedToken.expiresAt) {
			throw new UnauthorizedException('Refresh token has expired')
		}

		// Get user
		const user = await this.userService.findOneById(storedToken.userId)
		if (!user) {
			throw new UnauthorizedException('User not found')
		}

		// Rotate refresh token (invalidate old, create new)
		await this.revokeRefreshToken(storedToken.token, 'rotated')
		const newRefreshToken = await this.createRefreshToken(
			storedToken.userId,
			settings.refreshTokenDuration,
			context,
		)

		// Update old token with replacement reference
		await this.refreshTokenModel.update(
			{ token: tokenHash },
			{ replacedByToken: newRefreshToken.tokenHash },
		)

		// Update session with new refresh token
		if (settings.enableSessions) {
			await this.sessionModel.update(
				{ refreshTokenId: storedToken.token },
				{
					refreshTokenId: newRefreshToken.tokenHash,
					lastActivityAt: new Date(),
				},
			)
		}

		// Generate new access token using strategy
		const authResult = await this.authStrategy.login({
			email: user.email,
			password: '', // Strategy should handle this internally
		})

		return {
			...authResult,
			refresh_token: newRefreshToken.plainToken,
			expires_in: settings.sessionDuration * 3600,
			token_type: 'Bearer',
		}
	}

	/**
	 * Logout - revoke refresh token and end session
	 */
	async logout(refreshToken: string): Promise<void> {
		const tokenHash = this.hashToken(refreshToken)
		const storedToken = await this.refreshTokenModel.findOne({
			token: tokenHash,
		})

		if (storedToken) {
			await this.revokeRefreshToken(tokenHash, 'logout')

			// End associated session
			await this.sessionModel.update(
				{ refreshTokenId: tokenHash },
				{ active: false },
			)

			await this.emitEvent('user.logout', { userId: storedToken.userId })
		}
	}

	/**
	 * Logout from all devices
	 */
	async logoutAll(userId: string): Promise<void> {
		// Revoke all refresh tokens for user
		const tokens = await this.refreshTokenModel.findMany({
			userId,
			revoked: false,
		})
		for (const token of tokens) {
			await this.revokeRefreshToken(token.token, 'logout_all')
		}

		// End all sessions
		const sessions = await this.sessionModel.findMany({ userId, active: true })
		for (const session of sessions) {
			await this.sessionModel.update(
				{ sessionId: session.sessionId },
				{ active: false },
			)
		}

		await this.emitEvent('user.logout_all', { userId })
	}

	// ============================================================================
	// Session Management
	// ============================================================================

	/**
	 * Get active sessions for a user
	 */
	async getSessions(
		userId: string,
		currentSessionId?: string,
	): Promise<SessionInfo[]> {
		const sessions = await this.sessionModel.findMany({
			userId,
			active: true,
		})

		// Filter expired sessions
		const now = new Date()
		const activeSessions = sessions.filter((s) => s.expiresAt > now)

		return activeSessions.map((session) => ({
			sessionId: session.sessionId,
			deviceName: session.deviceName,
			deviceType: session.deviceType,
			browser: session.browser,
			os: session.os,
			ipAddress: session.ipAddress,
			location: session.location,
			createdAt: session.createdAt,
			lastActivityAt: session.lastActivityAt,
			current: session.sessionId === currentSessionId,
		}))
	}

	/**
	 * Revoke a specific session
	 */
	async revokeSession(userId: string, sessionId: string): Promise<void> {
		const session = await this.sessionModel.findOne({ userId, sessionId })
		if (!session) {
			throw new UserNotFoundError(`Session ${sessionId} not found`)
		}

		// Revoke associated refresh token
		await this.revokeRefreshToken(session.refreshTokenId, 'session_revoked')

		// End session
		await this.sessionModel.update({ sessionId }, { active: false })

		await this.emitEvent('user.session_revoked', { userId, sessionId })
	}

	// ============================================================================
	// Password Management
	// ============================================================================

	/**
	 * Validate password against policy
	 */
	async validatePasswordPolicy(
		password: string,
	): Promise<PasswordValidationResult> {
		const settings = await this.settingsService.get(AuthSettings)
		const errors: string[] = []

		if (password.length < settings.minPasswordLength) {
			errors.push(
				`Password must be at least ${settings.minPasswordLength} characters`,
			)
		}

		if (settings.requireUppercase && !/[A-Z]/.test(password)) {
			errors.push('Password must contain an uppercase letter')
		}

		if (settings.requireNumber && !/[0-9]/.test(password)) {
			errors.push('Password must contain a number')
		}

		if (
			settings.requireSpecialChar &&
			!/[!@#$%^&*(),.?":{}|<>]/.test(password)
		) {
			errors.push('Password must contain a special character')
		}

		return { valid: errors.length === 0, errors }
	}

	/**
	 * Request password reset
	 */
	async requestPasswordReset(
		email: string,
	): Promise<PasswordResetRequestResult | null> {
		const user = await this.userService.findOne({ email })
		if (!user) {
			// Don't reveal if user exists - return null silently
			this.logger.debug(
				`Password reset requested for non-existent email: ${email}`,
			)
			return null
		}

		const result = await this.passwordResetService.createResetRequest(user.id)
		await this.emitEvent('user.password_reset_requested', {
			userId: user.id,
			plainToken: result?.token,
			email: user.email,
		})

		return result
	}

	/**
	 * Reset password using token
	 */
	async resetPassword(token: string, newPassword: string): Promise<void> {
		// Validate password policy
		const validation = await this.validatePasswordPolicy(newPassword)
		if (!validation.valid) {
			throw new InvalidCredentialsError(validation.errors.join(', '))
		}

		// Validate token and get user ID
		const userId = await this.passwordResetService.validateResetToken(token)

		// Update password
		const hashedPassword = await hash(newPassword, 10)
		await this.userService.update(userId, { password: hashedPassword })

		// Mark token as used
		await this.passwordResetService.markTokenAsUsed(token)

		// Logout from all devices for security
		await this.logoutAll(userId)

		await this.emitEvent('user.password_reset', { userId })
	}

	/**
	 * Change user password (authenticated)
	 */
	async changePassword(
		userId: string,
		changePasswordDto: ChangePasswordDto,
	): Promise<{ message: string }> {
		const user = await this.userService.findOneById(userId)
		if (!user) throw new UserNotFoundError(userId)

		if (!user.password) {
			throw new InvalidCredentialsError(
				'This account uses OAuth login and has no local password to change.',
			)
		}

		const isPasswordValid = await compare(
			changePasswordDto.currentPassword,
			user.password,
		)
		if (!isPasswordValid) {
			throw new InvalidCredentialsError('Current password is incorrect')
		}

		// Validate new password policy
		const validation = await this.validatePasswordPolicy(
			changePasswordDto.newPassword,
		)
		if (!validation.valid) {
			throw new InvalidCredentialsError(validation.errors.join(', '))
		}

		const hashedPassword = await hash(changePasswordDto.newPassword, 10)
		await this.userService.update(userId, { password: hashedPassword })

		await this.emitEvent('user.password_changed', { userId })

		return { message: 'Password changed successfully' }
	}

	// ============================================================================
	// User Management
	// ============================================================================

	/**
	 * Check if any users exist in the system
	 */
	async exists(): Promise<boolean> {
		const strategy = this.authStrategy as AuthStrategy & {
			hasUsers?: () => Promise<boolean>
		}
		if (strategy.hasUsers) {
			try {
				return await strategy.hasUsers()
			} catch (error) {
				this.logger.warn(
					`Failed to check users from auth strategy, falling back to database: ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}

		const users = await this.userService.findAll()
		return users.length > 0
	}

	/**
	 * Get user by ID
	 */
	async getUserById(id: string): Promise<{
		id: string
		email: string
		name: string
		role: string | undefined
	}> {
		const user = await this.userService.findOneById(id)
		if (!user) throw new UserNotFoundError(id)

		return {
			id: user.id,
			email: user.email,
			name: user.name,
			role: user.role,
		}
	}

	/**
	 * Update user profile
	 */
	async updateProfile(
		userId: string,
		updateProfileDto: UpdateProfileDto,
	): Promise<{
		id: string
		email: string
		name: string
		role: string | undefined
	}> {
		const user = await this.userService.findOneById(userId)
		if (!user) throw new UserNotFoundError(userId)

		if (updateProfileDto.email && updateProfileDto.email !== user.email) {
			const existingUser = await this.userService.findOne({
				email: updateProfileDto.email,
			})
			if (existingUser)
				throw new DuplicateKeyError('email', updateProfileDto.email)
		}

		await this.userService.update(userId, updateProfileDto)
		return this.getUserById(userId)
	}

	/**
	 * Get the current auth strategy name
	 */
	getStrategyName(): string {
		return this.authStrategy.name
	}

	/**
	 * Returns the list of OAuth providers that are currently active.
	 * A provider is active when its credentials (clientId + clientSecret) are
	 * saved in OAuthSettings via the admin UI.
	 *
	 * Delegates to OAuthService.getActiveProviders() — no code-level config is
	 * required; credentials are stored entirely in the database.
	 *
	 * This is exposed via GET /auth/status so the admin UI knows which provider
	 * buttons to render on the login/signup forms.
	 */
	async getEnabledOAuthProviders(): Promise<string[]> {
		return this.oauthService.getActiveProviders()
	}

	/**
	 * Get information about the active auth strategy.
	 * Delegates to the strategy's getAuthInfo() if implemented (external adapters).
	 * Returns a default for built-in JWT strategy.
	 * Result is cached since strategy config doesn't change at runtime.
	 */
	private cachedAuthInfo: ExternalAuthInfo | null = null

	async getAuthInfo(): Promise<ExternalAuthInfo> {
		if (this.cachedAuthInfo) {
			return this.cachedAuthInfo
		}

		if (this.authStrategy.getAuthInfo) {
			try {
				this.cachedAuthInfo = await this.authStrategy.getAuthInfo()
			} catch {
				this.cachedAuthInfo = {
					strategy: this.authStrategy.name,
					isExternal: true,
					providers: [],
				}
			}
		} else {
			this.cachedAuthInfo = {
				strategy: this.authStrategy.name,
				isExternal: false,
				providers: [],
			}
		}

		return this.cachedAuthInfo
	}

	// ============================================================================
	// OAuth Helpers
	// ============================================================================

	/**
	 * Find an existing user by OAuth provider/providerId, or create one if not found.
	 * Called from the OAuth callback handler after Passport validates the provider token.
	 */
	async findOrCreateOAuthUser(
		provider: string,
		providerId: string,
		email: string,
		name: string,
	): Promise<AuthUser> {
		// Look up by provider + providerId first (most reliable)
		const existingByProvider = await this.userService.findOne({
			provider,
			providerId,
		})
		if (existingByProvider) {
			return {
				id: existingByProvider.id,
				email: existingByProvider.email,
				role: existingByProvider.role ?? 'viewer',
			}
		}

		// If the email exists as a local-only user, return it and link the provider
		if (email) {
			const existingByEmail = await this.userService.findOne({ email })
			if (existingByEmail) {
				await this.userService.update(existingByEmail.id, {
					provider,
					providerId,
				})
				return {
					id: existingByEmail.id,
					email: existingByEmail.email,
					role: existingByEmail.role ?? 'viewer',
				}
			}
		}

		// Create a new user for this OAuth identity
		const newUser = await this.userService.create({
			email,
			name,
			password: undefined,
			role: 'viewer',
			provider,
			providerId,
		})

		await this.emitEvent('user.registered', {
			userId: newUser.id,
			email: newUser.email,
			name: newUser.name,
		})

		return {
			id: newUser.id,
			email: newUser.email,
			role: newUser.role ?? 'viewer',
		}
	}

	/**
	 * Issue JWT tokens for a user authenticated via an OAuth provider.
	 * Bypasses credential validation — only called after Passport has already
	 * verified the OAuth token with the provider.
	 */
	async loginWithOAuthProfile(
		user: AuthUser,
		context: RequestContext = {},
	): Promise<AuthResult> {
		const settings = await this.settingsService.get(AuthSettings)

		// Enforce concurrent session limit if configured
		if (settings.enableSessions && settings.maxConcurrentSessions > 0) {
			await this.enforceConcurrentSessionLimit(
				user.id,
				settings.maxConcurrentSessions,
			)
		}

		// Sign an access token directly (OAuth users skip credential validation)
		const payload = { sub: user.id, email: user.email, role: user.role }
		const accessToken = this.jwtService.sign(payload)

		// Create a refresh token
		const refreshTokenData = await this.createRefreshToken(
			user.id,
			settings.refreshTokenDuration,
			context,
		)

		// Create session if enabled
		let sessionId: string | undefined
		if (settings.enableSessions) {
			const session = await this.createSession(
				user.id,
				refreshTokenData.id,
				context,
				settings,
			)
			sessionId = session.sessionId
		}

		await this.userService.update(user.id, { lastLogin: new Date() })
		await this.emitEvent('user.login', { userId: user.id, sessionId })

		return {
			access_token: accessToken,
			refresh_token: refreshTokenData.plainToken,
			expires_in: settings.sessionDuration * 3600,
			token_type: 'Bearer',
		}
	}

	// ============================================================================
	// Private Helpers
	// ============================================================================

	/**
	 * Check if account is locked due to failed attempts
	 */
	private async isAccountLocked(
		email: string,
		settings: AuthSettings,
	): Promise<boolean> {
		const windowStart = new Date()
		windowStart.setMinutes(windowStart.getMinutes() - settings.lockoutDuration)

		const attempts = await this.loginAttemptModel.findMany({ email })
		const recentFailures = attempts.filter(
			(a) => !a.success && a.timestamp >= windowStart,
		)

		return recentFailures.length >= settings.maxLoginAttempts
	}

	/**
	 * Log a login attempt
	 */
	private async logLoginAttempt(
		email: string,
		success: boolean,
		failureReason: LoginFailureReason | null,
		context: RequestContext,
	): Promise<void> {
		await this.loginAttemptModel.create({
			email,
			success,
			failureReason: failureReason ?? undefined,
			ipAddress: context.ipAddress,
			userAgent: context.userAgent,
			timestamp: new Date(),
		})
	}

	/**
	 * Create a refresh token
	 */
	private async createRefreshToken(
		userId: string,
		expiryDays: number,
		context: RequestContext,
	): Promise<{ id: string; plainToken: string; tokenHash: string }> {
		const plainToken = randomBytes(32).toString('hex')
		const tokenHash = this.hashToken(plainToken)
		const expiresAt = new Date()
		expiresAt.setDate(expiresAt.getDate() + expiryDays)

		const deviceInfo = this.parseUserAgent(context.userAgent)

		const token = await this.refreshTokenModel.create({
			token: tokenHash,
			userId,
			expiresAt,
			revoked: false,
			deviceInfo: deviceInfo.deviceName,
			ipAddress: context.ipAddress,
			userAgent: context.userAgent,
			createdAt: new Date(),
		})

		return {
			id: token.id ?? tokenHash,
			plainToken,
			tokenHash,
		}
	}

	/**
	 * Revoke a refresh token
	 */
	private async revokeRefreshToken(
		tokenHash: string,
		reason: string,
	): Promise<void> {
		await this.refreshTokenModel.update(
			{ token: tokenHash },
			{
				revoked: true,
				revokedAt: new Date(),
				revokedReason: reason,
			},
		)
	}

	/**
	 * Create a session
	 */
	private async createSession(
		userId: string,
		refreshTokenId: string,
		context: RequestContext,
		settings: AuthSettings,
	): Promise<Session> {
		const sessionId = randomBytes(16).toString('hex')
		const deviceInfo = this.parseUserAgent(context.userAgent)
		const expiresAt = new Date()
		expiresAt.setDate(expiresAt.getDate() + settings.refreshTokenDuration)

		const session = await this.sessionModel.create({
			userId,
			sessionId,
			refreshTokenId,
			deviceName: deviceInfo.deviceName,
			deviceType: deviceInfo.deviceType,
			browser: deviceInfo.browser,
			os: deviceInfo.os,
			ipAddress: context.ipAddress,
			active: true,
			createdAt: new Date(),
			lastActivityAt: new Date(),
			expiresAt,
		})

		return session
	}

	/**
	 * Enforce concurrent session limit
	 */
	private async enforceConcurrentSessionLimit(
		userId: string,
		maxSessions: number,
	): Promise<void> {
		const sessions = await this.sessionModel.findMany({ userId, active: true })
		const activeSessions = sessions.filter((s) => s.expiresAt > new Date())

		// Sort by creation time (oldest first)
		activeSessions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

		if (activeSessions.length >= maxSessions) {
			// Revoke oldest sessions to make room for new one
			const sessionsToRevoke = activeSessions.slice(
				0,
				activeSessions.length - maxSessions + 1,
			)
			for (const session of sessionsToRevoke) {
				await this.revokeSession(userId, session.sessionId)
			}
		}
	}

	/**
	 * Hash a token using SHA-256
	 */
	private hashToken(token: string): string {
		return createHash('sha256').update(token).digest('hex')
	}

	/**
	 * Parse user agent to extract device info
	 */
	private parseUserAgent(userAgent?: string): {
		deviceName?: string
		deviceType: DeviceType
		browser?: string
		os?: string
	} {
		if (!userAgent) {
			return { deviceType: 'unknown' }
		}

		// Basic parsing - in production, use a library like 'ua-parser-js'
		let deviceType: DeviceType = 'desktop'
		if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
			deviceType = /iPad|Tablet/i.test(userAgent) ? 'tablet' : 'mobile'
		}

		let browser: string | undefined
		if (/Chrome/i.test(userAgent)) browser = 'Chrome'
		else if (/Firefox/i.test(userAgent)) browser = 'Firefox'
		else if (/Safari/i.test(userAgent)) browser = 'Safari'
		else if (/Edge/i.test(userAgent)) browser = 'Edge'

		let os: string | undefined
		if (/Windows/i.test(userAgent)) os = 'Windows'
		else if (/Mac/i.test(userAgent)) os = 'macOS'
		else if (/Linux/i.test(userAgent)) os = 'Linux'
		else if (/Android/i.test(userAgent)) os = 'Android'
		else if (/iOS|iPhone|iPad/i.test(userAgent)) os = 'iOS'

		const deviceName = browser && os ? `${browser} on ${os}` : undefined

		return { deviceName, deviceType, browser, os }
	}

	/**
	 * Emit an auth event
	 */
	private async emitEvent(
		event: string,
		payload: Record<string, unknown>,
	): Promise<void> {
		try {
			// Type assertion needed as event types may not include all auth events
			await this.eventService.emit(
				event as Parameters<typeof this.eventService.emit>[0],
				payload,
			)
		} catch (error) {
			// Don't fail auth operations due to event emission errors
			this.logger.warn(
				`Failed to emit event ${event}: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}
}
