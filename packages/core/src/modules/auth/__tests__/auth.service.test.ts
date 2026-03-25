import 'reflect-metadata'
import { UnauthorizedException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Must be hoisted before any import that transitively loads @magnet-cms/common decorators.
vi.mock('@magnet-cms/common', () => ({
  InjectModel: () => () => {},
  Model: class {},
  Schema: () => () => {},
  Field: new Proxy({}, { get: () => () => () => {} }),
  Prop: () => () => {},
  Settings: () => () => {},
  SettingField: new Proxy({}, { get: () => () => () => {} }),
  Inject: () => () => {},
  Optional: () => () => {},
  InvalidCredentialsError: class InvalidCredentialsError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'InvalidCredentialsError'
    }
  },
  DuplicateKeyError: class DuplicateKeyError extends Error {
    constructor(field: string, value: string) {
      super(`Duplicate ${field}: ${value}`)
      this.name = 'DuplicateKeyError'
    }
  },
  UserNotFoundError: class UserNotFoundError extends Error {
    constructor(id: string) {
      super(`User not found: ${id}`)
      this.name = 'UserNotFoundError'
    }
  },
}))

vi.mock('bcryptjs', () => ({
  hash: vi.fn(async (pw: string, _rounds: number) => `hashed:${pw}`),
  compare: vi.fn(async (pw: string, hash: string) => hash === `hashed:${pw}`),
}))

import { AuthService } from '../auth.service'

// ─── Default Settings ─────────────────────────────────────────────────────────

const defaultSettings = {
  minPasswordLength: 8,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialChar: false,
  maxLoginAttempts: 5,
  lockoutDuration: 15,
  enableSessions: false, // disabled to avoid session model complexity in unit tests
  maxConcurrentSessions: 0,
  sessionDuration: 24,
  refreshTokenDuration: 7,
  requireEmailVerification: false,
}

// ─── Mock Dependencies ────────────────────────────────────────────────────────

const mockUserService = {
  findAll: vi.fn(),
  findOne: vi.fn(),
  findOneById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}

const mockSettingsService = {
  get: vi.fn(),
  getSettingsByGroup: vi.fn(),
}

const mockEventService = {
  emit: vi.fn(),
}

const mockPasswordResetService = {
  createResetRequest: vi.fn(),
  validateResetToken: vi.fn(),
  markTokenAsUsed: vi.fn(),
}

const mockJwtService = {
  sign: vi.fn(() => 'mock-access-token'),
  verify: vi.fn(),
}

const mockAuthStrategy = {
  name: 'local',
  register: vi.fn(),
  login: vi.fn(),
  validateCredentials: vi.fn(),
}

const mockRefreshTokenModel = {
  find: vi.fn(),
  findOne: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

const mockSessionModel = {
  find: vi.fn(),
  findOne: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

const mockLoginAttemptModel = {
  find: vi.fn(),
  findOne: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

const mockLogger = {
  setContext: vi.fn(),
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  verbose: vi.fn(),
}

const mockOAuthService = {
  getActiveProviders: vi.fn(),
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService

  beforeEach(() => {
    vi.clearAllMocks()
    mockSettingsService.get.mockResolvedValue(defaultSettings)
    mockEventService.emit.mockResolvedValue(undefined)
    mockLoginAttemptModel.findMany.mockResolvedValue([])
    mockLoginAttemptModel.create.mockResolvedValue({})
    mockUserService.update.mockResolvedValue({})

    service = new AuthService(
      mockUserService as never,
      mockSettingsService as never,
      mockEventService as never,
      mockPasswordResetService as never,
      mockJwtService as never,
      mockAuthStrategy as never,
      null,
      mockRefreshTokenModel as never,
      mockSessionModel as never,
      mockLoginAttemptModel as never,
      mockLogger as never,
      mockOAuthService as never,
    )
  })

  // ─── validatePasswordPolicy ──────────────────────────────────────────

  describe('validatePasswordPolicy', () => {
    it('should pass for a valid password', async () => {
      const result = await service.validatePasswordPolicy('ValidPass1')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail when password is too short', async () => {
      const result = await service.validatePasswordPolicy('Ab1')
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('at least 8 characters')
    })

    it('should fail when password has no uppercase letter', async () => {
      const result = await service.validatePasswordPolicy('nouppercase1')
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('uppercase'))).toBe(true)
    })

    it('should fail when password has no number', async () => {
      const result = await service.validatePasswordPolicy('NoNumbers!')
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('number'))).toBe(true)
    })

    it('should require special char when enabled in settings', async () => {
      mockSettingsService.get.mockResolvedValue({
        ...defaultSettings,
        requireSpecialChar: true,
      })
      const result = await service.validatePasswordPolicy('ValidPass1')
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('special'))).toBe(true)
    })

    it('should pass with special char when required', async () => {
      mockSettingsService.get.mockResolvedValue({
        ...defaultSettings,
        requireSpecialChar: true,
      })
      const result = await service.validatePasswordPolicy('ValidPass1!')
      expect(result.valid).toBe(true)
    })

    it('should accumulate multiple errors', async () => {
      const result = await service.validatePasswordPolicy('ab') // short, no upper, no number
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })
  })

  // ─── register ─────────────────────────────────────────────────────────

  describe('register', () => {
    const validRegisterDto = {
      email: 'test@example.com',
      password: 'ValidPass1',
      name: 'Test User',
      role: 'user',
    }

    beforeEach(() => {
      mockUserService.findAll.mockResolvedValue([])
      mockUserService.findOne.mockResolvedValue(null)
      mockUserService.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      })
      mockAuthStrategy.register.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
      })
    })

    it('should assign admin role to first user', async () => {
      mockUserService.findAll.mockResolvedValue([]) // no existing users

      const result = await service.register(validRegisterDto)
      expect(result.role).toBe('admin')
      expect(mockAuthStrategy.register).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'admin' }),
      )
    })

    it('should use requested role for subsequent users', async () => {
      mockUserService.findAll.mockResolvedValue([{ id: 'existing' }])
      mockAuthStrategy.register.mockResolvedValue({
        id: 'user-2',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      })

      await service.register(validRegisterDto)
      expect(mockAuthStrategy.register).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'user' }),
      )
    })

    it('should throw when password fails validation', async () => {
      await expect(service.register({ ...validRegisterDto, password: 'weak' })).rejects.toThrow()
    })

    it('should create local user record if auth strategy did not', async () => {
      mockUserService.findOne.mockResolvedValue(null)

      await service.register(validRegisterDto)

      expect(mockUserService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' }),
      )
    })

    it('should not create local user if one already exists', async () => {
      mockUserService.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      })

      await service.register(validRegisterDto)

      expect(mockUserService.create).not.toHaveBeenCalled()
    })

    it('should emit user.registered event', async () => {
      await service.register(validRegisterDto)
      expect(mockEventService.emit).toHaveBeenCalledWith(
        'user.registered',
        expect.objectContaining({ email: 'test@example.com' }),
      )
    })
  })

  // ─── login ─────────────────────────────────────────────────────────────

  describe('login', () => {
    const credentials = { email: 'test@example.com', password: 'ValidPass1' }

    beforeEach(() => {
      mockAuthStrategy.validateCredentials.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'user',
      })
      mockAuthStrategy.login.mockResolvedValue({ access_token: 'mock-token' })
      mockUserService.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      })
      mockUserService.findOneById.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      })
      mockRefreshTokenModel.create.mockResolvedValue({
        id: 'rt-1',
        token: 'hash-token',
      })
    })

    it('should return auth result on successful login', async () => {
      const result = await service.login(credentials)
      expect(result.access_token).toBe('mock-token')
      expect(result.token_type).toBe('Bearer')
      expect(result.refresh_token).toBeDefined()
    })

    it('should throw when credentials are invalid', async () => {
      mockAuthStrategy.validateCredentials.mockResolvedValue(null)

      await expect(service.login(credentials)).rejects.toThrow(UnauthorizedException)
    })

    it('should throw when account is locked', async () => {
      // Fill login attempts to hit the lockout threshold
      const windowStart = new Date()
      windowStart.setMinutes(windowStart.getMinutes() - 10)
      const recentFailures = Array.from({ length: 5 }, (_, _i) => ({
        email: credentials.email,
        success: false,
        timestamp: new Date(), // within window
      }))
      mockLoginAttemptModel.findMany.mockResolvedValue(recentFailures)

      await expect(service.login(credentials)).rejects.toThrow(/locked/i)
    })

    it('should log login attempt on success', async () => {
      await service.login(credentials)
      expect(mockLoginAttemptModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      )
    })

    it('should log login attempt on invalid credentials', async () => {
      mockAuthStrategy.validateCredentials.mockResolvedValue(null)

      await expect(service.login(credentials)).rejects.toThrow()
      expect(mockLoginAttemptModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      )
    })

    it('should emit user.login event on success', async () => {
      await service.login(credentials)
      expect(mockEventService.emit).toHaveBeenCalledWith(
        'user.login',
        expect.objectContaining({ userId: 'user-1' }),
      )
    })
  })

  // ─── refresh ───────────────────────────────────────────────────────────

  describe('refresh', () => {
    const validToken = 'valid-refresh-token'

    beforeEach(() => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      mockRefreshTokenModel.findOne.mockResolvedValue({
        token: 'hashed-token',
        userId: 'user-1',
        expiresAt: futureDate,
        revoked: false,
      })
      mockUserService.findOneById.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        role: 'user',
      })
      mockRefreshTokenModel.update.mockResolvedValue({})
      mockRefreshTokenModel.create.mockResolvedValue({
        id: 'new-rt',
        token: 'new-hash',
      })
      mockAuthStrategy.login.mockResolvedValue({
        access_token: 'new-access-token',
      })
    })

    it('should return new tokens on valid refresh', async () => {
      const result = await service.refresh(validToken)
      expect(result.access_token).toBe('new-access-token')
      expect(result.refresh_token).toBeDefined()
      expect(result.token_type).toBe('Bearer')
    })

    it('should rotate refresh token on success', async () => {
      await service.refresh(validToken)
      // Old token should be revoked (update called with revoked: true)
      expect(mockRefreshTokenModel.update).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ revoked: true }),
      )
    })

    it('should throw on invalid refresh token', async () => {
      mockRefreshTokenModel.findOne.mockResolvedValue(null)

      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException)
    })

    it('should throw on expired refresh token', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)

      mockRefreshTokenModel.findOne.mockResolvedValue({
        token: 'hashed-token',
        userId: 'user-1',
        expiresAt: pastDate,
        revoked: false,
      })

      await expect(service.refresh(validToken)).rejects.toThrow(/expired/i)
    })

    it('should throw when user no longer exists', async () => {
      mockUserService.findOneById.mockResolvedValue(null)

      await expect(service.refresh(validToken)).rejects.toThrow(UnauthorizedException)
    })
  })
})
