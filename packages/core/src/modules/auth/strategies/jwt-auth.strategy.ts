import type {
  AuthConfig,
  AuthResult,
  AuthStrategy,
  AuthUser,
  LoginCredentials,
  RegisterData,
} from '@magnet-cms/common'
import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { compare, hash } from 'bcryptjs'
import { type SignOptions, sign } from 'jsonwebtoken'
import type { StringValue } from 'ms'
import { ExtractJwt, Strategy } from 'passport-jwt'

import type { UserService } from '~/modules/user'

/**
 * JWT-based authentication strategy.
 * This is the default strategy that maintains backward compatibility.
 *
 * Extends PassportStrategy for integration with NestJS guards,
 * and implements AuthStrategy for the extensible auth system.
 */
export class JwtAuthStrategy extends PassportStrategy(Strategy, 'jwt') implements AuthStrategy {
  readonly name = 'jwt'
  private readonly secret: string
  private readonly expiresIn: string

  constructor(
    config: AuthConfig,
    private readonly userService: UserService,
  ) {
    const secret = config.jwt?.secret || ''
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    })

    this.secret = secret
    this.expiresIn = config.jwt?.expiresIn || '7d'
  }

  /**
   * Passport validate method - called by JwtAuthGuard after JWT is verified.
   * Also satisfies the AuthStrategy.validate() interface.
   */
  async validate(
    payload: { sub: string; email: string; role: string } | unknown,
  ): Promise<AuthUser | null> {
    // Handle JWT payload format
    if (payload && typeof payload === 'object' && 'sub' in payload && 'email' in payload) {
      const jwtPayload = payload as {
        sub: string
        email: string
        role: string
        user_metadata?: { role?: string; name?: string }
      }
      // External auth providers (Supabase, Clerk) may store the application
      // role in user_metadata rather than the top-level role claim.
      const role = jwtPayload.user_metadata?.role || jwtPayload.role || 'viewer'

      // Resolve local user ID — external auth providers use provider-specific
      // IDs that may not match the local database. Look up by email to get
      // the correct local ID for downstream operations.
      let userId = jwtPayload.sub
      if (jwtPayload.user_metadata) {
        const localUser = await this.userService.findOne({
          email: jwtPayload.email,
        })
        if (localUser) {
          userId = localUser.id
        }
      }

      return {
        id: userId,
        email: jwtPayload.email,
        role,
      }
    }
    return null
  }

  /**
   * Validate user credentials against the database
   */
  async validateCredentials(email: string, password: string): Promise<AuthUser | null> {
    const user = await this.userService.findOne({ email })
    if (!user) return null

    if (!user.password) return null
    const isPasswordValid = await compare(password, user.password)
    if (!isPasswordValid) return null

    return {
      id: user.id,
      email: user.email,
      role: user.role || 'viewer',
    }
  }

  /**
   * Authenticate and return JWT token
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const user = await this.validateCredentials(credentials.email, credentials.password)
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const payload = { sub: user.id, email: user.email, role: user.role }
    const signOptions: SignOptions = {
      expiresIn: this.expiresIn as StringValue,
    }
    const token = sign(payload, this.secret, signOptions)

    return {
      access_token: token,
      token_type: 'Bearer',
    }
  }

  /**
   * Register a new user and return the user object
   */
  async register(data: RegisterData): Promise<AuthUser> {
    const existingUser = await this.userService.findOne({ email: data.email })
    if (existingUser) {
      throw new ConflictException('Email already in use')
    }

    const hashedPassword = await hash(data.password, 10)
    const newUser = await this.userService.create({
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: data.role || 'viewer',
    })

    return {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role || 'viewer',
    }
  }

  getPassportStrategyName(): string {
    return 'jwt'
  }
}
