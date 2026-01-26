# Plan 007: Authentication Enhancements

**Status:** Proposed
**Priority:** High
**Estimated Effort:** 2 weeks
**Depends on:** Plan 000 (Type Safety), Plan 000b (Event System for login events), Plan 003 (Settings for AuthSettings)

---

## Summary

Enhance the authentication system with refresh tokens, session management, improved security, and configurable auth settings.

---

## Current State

### What Exists
- JWT access tokens (7d expiry)
- bcryptjs password hashing
- Basic login/register/profile endpoints
- Pluggable auth strategy system
- `AuthResult.refresh_token` field (defined but not implemented)

### What's Missing
- Refresh token implementation
- Session management
- Token blacklisting/logout
- Password reset flow
- Email verification
- Rate limiting on auth endpoints
- Configurable password policies
- 2FA/MFA support
- Login attempt tracking

---

## Proposed Implementation

### 1. Auth Settings

```typescript
@Settings({
  group: 'auth',
  label: 'Authentication',
  icon: 'shield',
  order: 25,
})
export class AuthSettings {
  // Token Settings
  @Setting.Number({
    label: 'Access Token Expiry (hours)',
    description: 'How long access tokens remain valid',
    min: 1,
    max: 168,  // 7 days
  })
  accessTokenExpiryHours: number = 24

  @Setting.Number({
    label: 'Refresh Token Expiry (days)',
    description: 'How long refresh tokens remain valid',
    min: 1,
    max: 90,
  })
  refreshTokenExpiryDays: number = 30

  // Password Policy
  @Setting.Number({
    label: 'Minimum Password Length',
    min: 6,
    max: 32,
  })
  minPasswordLength: number = 8

  @Setting.Boolean({
    label: 'Require Uppercase',
    description: 'Password must contain uppercase letter',
  })
  requireUppercase: boolean = true

  @Setting.Boolean({
    label: 'Require Number',
    description: 'Password must contain a number',
  })
  requireNumber: boolean = true

  @Setting.Boolean({
    label: 'Require Special Character',
  })
  requireSpecialChar: boolean = false

  // Registration
  @Setting.Boolean({
    label: 'Allow Registration',
    description: 'Allow new users to register',
  })
  allowRegistration: boolean = true

  @Setting.Boolean({
    label: 'Require Email Verification',
    description: 'Require email verification before login',
  })
  requireEmailVerification: boolean = false

  // Security
  @Setting.Number({
    label: 'Max Login Attempts',
    description: 'Before temporary lockout',
    min: 3,
    max: 10,
  })
  maxLoginAttempts: number = 5

  @Setting.Number({
    label: 'Lockout Duration (minutes)',
    min: 5,
    max: 60,
  })
  lockoutDuration: number = 15

  @Setting.Boolean({
    label: 'Enable Session Management',
    description: 'Track and manage active sessions',
  })
  enableSessions: boolean = true

  @Setting.Number({
    label: 'Max Concurrent Sessions',
    description: '0 = unlimited',
    min: 0,
    max: 10,
  })
  maxConcurrentSessions: number = 0
}
```

### 2. Refresh Token Schema

```typescript
@Schema({ versioning: false, i18n: false })
export class RefreshToken {
  @Prop({ required: true, unique: true, index: true })
  token: string  // Hashed token

  @Prop({ required: true, index: true })
  userId: string

  @Prop({ required: true })
  expiresAt: Date

  @Prop({ default: false })
  revoked: boolean

  @Prop()
  revokedAt?: Date

  @Prop()
  revokedReason?: string

  @Prop()
  replacedByToken?: string  // For token rotation

  // Session info
  @Prop()
  deviceInfo?: string

  @Prop()
  ipAddress?: string

  @Prop()
  userAgent?: string

  @Prop({ default: () => new Date() })
  createdAt: Date

  @Prop()
  lastUsedAt?: Date
}
```

### 3. Session Schema

```typescript
@Schema({ versioning: false, i18n: false })
export class Session {
  @Prop({ required: true, index: true })
  userId: string

  @Prop({ required: true, unique: true })
  sessionId: string

  @Prop({ required: true })
  refreshTokenId: string

  @Prop()
  deviceName?: string

  @Prop()
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown'

  @Prop()
  browser?: string

  @Prop()
  os?: string

  @Prop()
  ipAddress?: string

  @Prop()
  location?: string  // Derived from IP

  @Prop({ default: true })
  active: boolean

  @Prop({ default: () => new Date() })
  createdAt: Date

  @Prop()
  lastActivityAt?: Date

  @Prop()
  expiresAt: Date
}
```

### 4. Login Attempt Schema

```typescript
@Schema({ versioning: false, i18n: false })
export class LoginAttempt {
  @Prop({ required: true, index: true })
  email: string

  @Prop({ required: true })
  success: boolean

  @Prop()
  failureReason?: 'invalid_password' | 'user_not_found' | 'account_locked' | 'email_not_verified'

  @Prop()
  ipAddress?: string

  @Prop()
  userAgent?: string

  @Prop({ default: () => new Date() })
  timestamp: Date
}
```

### 5. Enhanced Auth Service

```typescript
@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private settings: SettingsService,
    private eventService: EventService,
    @Inject(REFRESH_TOKEN_MODEL) private refreshTokenModel: Model<RefreshToken>,
    @Inject(SESSION_MODEL) private sessionModel: Model<Session>,
    @Inject(LOGIN_ATTEMPT_MODEL) private loginAttemptModel: Model<LoginAttempt>,
  ) {}

  /**
   * Login with email and password
   */
  async login(credentials: LoginDto, context: RequestContext): Promise<AuthResult> {
    const authSettings = await this.settings.get(AuthSettings)

    // Check if account is locked
    const isLocked = await this.isAccountLocked(credentials.email, authSettings)
    if (isLocked) {
      await this.logLoginAttempt(credentials.email, false, 'account_locked', context)
      throw new UnauthorizedException('Account temporarily locked. Try again later.')
    }

    // Validate credentials
    const user = await this.validateCredentials(credentials.email, credentials.password)
    if (!user) {
      await this.logLoginAttempt(credentials.email, false, 'invalid_password', context)
      throw new UnauthorizedException('Invalid credentials')
    }

    // Check email verification
    if (authSettings.requireEmailVerification && !user.emailVerified) {
      await this.logLoginAttempt(credentials.email, false, 'email_not_verified', context)
      throw new UnauthorizedException('Please verify your email first')
    }

    // Check concurrent sessions
    if (authSettings.maxConcurrentSessions > 0) {
      await this.enforceConcurrentSessionLimit(user.id, authSettings.maxConcurrentSessions)
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user, authSettings.accessTokenExpiryHours)
    const refreshToken = await this.createRefreshToken(user.id, authSettings.refreshTokenExpiryDays, context)

    // Create session
    if (authSettings.enableSessions) {
      await this.createSession(user.id, refreshToken._id, context)
    }

    // Log success
    await this.logLoginAttempt(credentials.email, true, null, context)
    await this.eventService.emit('user.login', { userId: user.id })

    return {
      access_token: accessToken,
      refresh_token: refreshToken.plainToken,
      expires_in: authSettings.accessTokenExpiryHours * 3600,
      token_type: 'Bearer',
    }
  }

  /**
   * Refresh access token
   */
  async refresh(refreshToken: string, context: RequestContext): Promise<AuthResult> {
    const authSettings = await this.settings.get(AuthSettings)

    // Validate refresh token
    const tokenHash = this.hashToken(refreshToken)
    const storedToken = await this.refreshTokenModel.findOne({
      token: tokenHash,
      revoked: false,
      expiresAt: { $gt: new Date() },
    })

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }

    // Get user
    const user = await this.userService.findOneById(storedToken.userId)
    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    // Rotate refresh token (invalidate old, create new)
    await this.revokeRefreshToken(storedToken._id, 'rotated')
    const newRefreshToken = await this.createRefreshToken(
      user.id,
      authSettings.refreshTokenExpiryDays,
      context,
    )
    newRefreshToken.replacedByToken = storedToken.token

    // Update session
    await this.sessionModel.updateOne(
      { refreshTokenId: storedToken._id },
      {
        refreshTokenId: newRefreshToken._id,
        lastActivityAt: new Date(),
      },
    )

    // Generate new access token
    const accessToken = this.generateAccessToken(user, authSettings.accessTokenExpiryHours)

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken.plainToken,
      expires_in: authSettings.accessTokenExpiryHours * 3600,
      token_type: 'Bearer',
    }
  }

  /**
   * Logout - revoke refresh token and end session
   */
  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken)
    const storedToken = await this.refreshTokenModel.findOne({ token: tokenHash })

    if (storedToken) {
      await this.revokeRefreshToken(storedToken._id, 'logout')
      await this.sessionModel.updateOne(
        { refreshTokenId: storedToken._id },
        { active: false },
      )
    }

    await this.eventService.emit('user.logout', { tokenId: storedToken?._id })
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenModel.updateMany(
      { userId, revoked: false },
      { revoked: true, revokedAt: new Date(), revokedReason: 'logout_all' },
    )

    await this.sessionModel.updateMany({ userId }, { active: false })

    await this.eventService.emit('user.logout_all', { userId })
  }

  /**
   * Get active sessions for user
   */
  async getSessions(userId: string): Promise<Session[]> {
    return this.sessionModel.find({
      userId,
      active: true,
      expiresAt: { $gt: new Date() },
    }).sort({ lastActivityAt: -1 })
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionModel.findOne({ userId, sessionId })
    if (!session) {
      throw new NotFoundException('Session not found')
    }

    await this.revokeRefreshToken(session.refreshTokenId, 'session_revoked')
    await this.sessionModel.updateOne({ _id: session._id }, { active: false })
  }

  /**
   * Validate password against policy
   */
  async validatePasswordPolicy(password: string): Promise<{ valid: boolean; errors: string[] }> {
    const settings = await this.settings.get(AuthSettings)
    const errors: string[] = []

    if (password.length < settings.minPasswordLength) {
      errors.push(`Password must be at least ${settings.minPasswordLength} characters`)
    }

    if (settings.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain an uppercase letter')
    }

    if (settings.requireNumber && !/[0-9]/.test(password)) {
      errors.push('Password must contain a number')
    }

    if (settings.requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain a special character')
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Check if account is locked due to failed attempts
   */
  private async isAccountLocked(email: string, settings: AuthSettings): Promise<boolean> {
    const windowStart = new Date()
    windowStart.setMinutes(windowStart.getMinutes() - settings.lockoutDuration)

    const recentFailures = await this.loginAttemptModel.countDocuments({
      email,
      success: false,
      timestamp: { $gte: windowStart },
    })

    return recentFailures >= settings.maxLoginAttempts
  }

  /**
   * Enforce concurrent session limit
   */
  private async enforceConcurrentSessionLimit(userId: string, maxSessions: number): Promise<void> {
    const activeSessions = await this.sessionModel
      .find({ userId, active: true })
      .sort({ createdAt: 1 })

    if (activeSessions.length >= maxSessions) {
      // Revoke oldest sessions
      const sessionsToRevoke = activeSessions.slice(0, activeSessions.length - maxSessions + 1)
      for (const session of sessionsToRevoke) {
        await this.revokeSession(userId, session.sessionId)
      }
    }
  }

  // Helper methods
  private generateAccessToken(user: AuthUser, expiryHours: number): string { ... }
  private async createRefreshToken(userId: string, expiryDays: number, context: RequestContext): Promise<RefreshToken & { plainToken: string }> { ... }
  private async revokeRefreshToken(tokenId: string, reason: string): Promise<void> { ... }
  private hashToken(token: string): string { ... }
  private async logLoginAttempt(email: string, success: boolean, reason: string | null, context: RequestContext): Promise<void> { ... }
  private async createSession(userId: string, refreshTokenId: string, context: RequestContext): Promise<Session> { ... }
}
```

### 6. Password Reset Flow

```typescript
@Injectable()
export class PasswordResetService {
  constructor(
    private userService: UserService,
    private mailService: MailService,  // If email module exists
    @Inject(PASSWORD_RESET_MODEL) private model: Model<PasswordReset>,
  ) {}

  /**
   * Request password reset
   */
  async requestReset(email: string): Promise<void> {
    const user = await this.userService.findOne({ email })
    if (!user) {
      // Don't reveal if user exists
      return
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    // Store reset request
    await this.model.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 3600000),  // 1 hour
    })

    // Send email (if mail service exists)
    if (this.mailService) {
      await this.mailService.send({
        to: email,
        template: 'password-reset',
        data: {
          resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${token}`,
          userName: user.name,
        },
      })
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const resetRequest = await this.model.findOne({
      tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    })

    if (!resetRequest) {
      throw new BadRequestException('Invalid or expired reset token')
    }

    // Validate password policy
    const validation = await this.authService.validatePasswordPolicy(newPassword)
    if (!validation.valid) {
      throw new BadRequestException(validation.errors.join(', '))
    }

    // Update password
    await this.userService.updatePassword(resetRequest.userId, newPassword)

    // Mark token as used
    await this.model.updateOne({ _id: resetRequest._id }, { used: true })

    // Revoke all refresh tokens (force re-login)
    await this.authService.logoutAll(resetRequest.userId)
  }
}
```

### 7. Enhanced Auth Controller

```typescript
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private passwordResetService: PasswordResetService,
  ) {}

  @Post('login')
  async login(@Body() credentials: LoginDto, @Req() req: Request): Promise<AuthResult> {
    return this.authService.login(credentials, this.getContext(req))
  }

  @Post('register')
  async register(@Body() data: RegisterDto, @Req() req: Request): Promise<AuthResult> {
    // Validate password policy
    const validation = await this.authService.validatePasswordPolicy(data.password)
    if (!validation.valid) {
      throw new BadRequestException(validation.errors)
    }

    const user = await this.authService.register(data)
    return this.authService.login({ email: data.email, password: data.password }, this.getContext(req))
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshTokenDto, @Req() req: Request): Promise<AuthResult> {
    return this.authService.refresh(body.refresh_token, this.getContext(req))
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Body() body: RefreshTokenDto): Promise<void> {
    await this.authService.logout(body.refresh_token)
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAll(@Req() req: Request): Promise<void> {
    await this.authService.logoutAll(req.user.id)
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(@Req() req: Request): Promise<Session[]> {
    return this.authService.getSessions(req.user.id)
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  async revokeSession(@Req() req: Request, @Param('sessionId') sessionId: string): Promise<void> {
    await this.authService.revokeSession(req.user.id, sessionId)
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto): Promise<void> {
    await this.passwordResetService.requestReset(body.email)
  }

  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto): Promise<void> {
    await this.passwordResetService.resetPassword(body.token, body.password)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request): Promise<AuthUser> {
    return this.authService.getUserById(req.user.id)
  }

  private getContext(req: Request): RequestContext {
    return {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    }
  }
}
```

---

## API Endpoints

```
# Authentication
POST   /auth/login                # Login with credentials
POST   /auth/register             # Register new user
POST   /auth/refresh              # Refresh access token
POST   /auth/logout               # Logout (revoke refresh token)
POST   /auth/logout-all           # Logout from all devices
GET    /auth/me                   # Get current user

# Sessions
GET    /auth/sessions             # List active sessions
DELETE /auth/sessions/:id         # Revoke specific session

# Password
POST   /auth/forgot-password      # Request password reset
POST   /auth/reset-password       # Reset password with token
PUT    /auth/account/password     # Change password (authenticated)

# Profile
PUT    /auth/account/profile      # Update profile
```

---

## File Changes Summary

### New Files
| Path | Description |
|------|-------------|
| `packages/core/src/modules/auth/schemas/refresh-token.schema.ts` | Refresh token schema |
| `packages/core/src/modules/auth/schemas/session.schema.ts` | Session schema |
| `packages/core/src/modules/auth/schemas/login-attempt.schema.ts` | Login attempt schema |
| `packages/core/src/modules/auth/schemas/password-reset.schema.ts` | Password reset schema |
| `packages/core/src/modules/auth/services/password-reset.service.ts` | Password reset service |
| `packages/core/src/modules/auth/auth.settings.ts` | Auth settings |

### Modified Files
| Path | Changes |
|------|---------|
| `packages/core/src/modules/auth/auth.service.ts` | Add refresh tokens, sessions, lockout |
| `packages/core/src/modules/auth/auth.controller.ts` | Add new endpoints |
| `packages/core/src/modules/auth/auth.module.ts` | Register new providers |
| `packages/common/src/types/auth.types.ts` | Add new types |

---

## Admin UI Integration

### Sessions Page
- List of active sessions with device info
- "This device" indicator
- "Revoke" button per session
- "Logout all devices" button
- Last activity timestamp

### Security Settings
- Password policy configuration
- Session limits
- Lockout settings

---

## Success Criteria

1. Refresh token flow works correctly
2. Token rotation on refresh
3. Session tracking with device info
4. Account lockout after failed attempts
5. Password policy validation
6. Password reset flow works
7. Concurrent session limits enforced
8. Admin can configure all settings
9. Sessions visible and revocable in UI
