import { createClerkClient, verifyToken } from '@clerk/backend'
import type {
  AuthConfig,
  AuthMagnetProvider,
  AuthResult,
  AuthStrategy,
  AuthUser,
  EnvVarRequirement,
  ExternalAuthInfo,
  LoginCredentials,
  RegisterData,
} from '@magnet-cms/common'
import { UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
// passport-custom has no @types; Strategy constructor takes a verify callback

const { Strategy } = require('passport-custom') as {
  Strategy: new (
    verify: (req: unknown, done: (err: Error | null, user?: AuthUser | false) => void) => void,
  ) => object
}

/**
 * Clerk-specific auth configuration
 */
export interface ClerkAuthConfig extends AuthConfig {
  /** CLERK_SECRET_KEY — for verifyToken() and the Clerk Users API */
  secretKey?: string
  /** CLERK_JWT_KEY (PEM public key) — enables networkless JWT verification */
  jwtKey?: string
  /** Allowed parties for JWT audience validation */
  authorizedParties?: string[]
  /** Default role for users without publicMetadata.role */
  defaultRole?: string
}

const CLERK_NOT_SUPPORTED =
  'Clerk handles authentication externally. Use Clerk sign-in components and send the session token in the Authorization header.'

/**
 * Clerk authentication strategy for Magnet CMS.
 *
 * Clerk issues RS256-signed JWTs that are verified via `@clerk/backend`'s
 * `verifyToken()`. Unlike the built-in JWT strategy, Clerk manages sign-in,
 * sign-up, and token refresh entirely in its hosted UI — Magnet only validates
 * incoming tokens.
 *
 * @example
 * ```typescript
 * import { AuthStrategyFactory } from '@magnet-cms/core'
 * import { ClerkAuthStrategy } from '@magnet-cms/adapter-auth-clerk'
 *
 * AuthStrategyFactory.registerStrategy('clerk', ClerkAuthStrategy)
 *
 * MagnetModule.forRoot({
 *   auth: {
 *     strategy: 'clerk',
 *     secretKey: process.env.CLERK_SECRET_KEY,
 *     // optional: jwtKey for networkless verification
 *     jwtKey: process.env.CLERK_JWT_KEY,
 *     // optional: restrict accepted issuers
 *     authorizedParties: ['https://your-app.example.com'],
 *   },
 * })
 * ```
 */
export class ClerkAuthStrategy
  extends (PassportStrategy(Strategy, 'clerk') as new () => object)
  implements AuthStrategy
{
  readonly name = 'clerk'
  private readonly config: ClerkAuthConfig

  constructor(config: AuthConfig, _userService?: unknown) {
    super()
    this.config = config as ClerkAuthConfig
  }

  /**
   * Called by Passport (via passport-custom) with the raw HTTP request.
   * Extracts the Bearer token and verifies it with Clerk's verifyToken().
   * Also satisfies AuthStrategy.validate(payload: unknown).
   */
  async validate(reqOrPayload: unknown): Promise<AuthUser | null> {
    // Passport-custom passes the full request; AuthStrategy.validate passes a payload.
    // Distinguish by checking for a request-like shape.
    const isRequest =
      reqOrPayload !== null && typeof reqOrPayload === 'object' && 'headers' in reqOrPayload

    if (!isRequest) {
      // Direct payload call (unusual for Clerk). Return null — Passport handles auth.
      return null
    }

    const req = reqOrPayload as {
      headers: { authorization?: string; cookie?: string }
    }

    const token = this.extractToken(req)
    if (!token) {
      throw new UnauthorizedException('No Clerk session token provided')
    }

    try {
      const payload = await verifyToken(token, {
        secretKey: this.config.secretKey,
        jwtKey: this.config.jwtKey,
        authorizedParties: this.config.authorizedParties,
      })

      const role =
        (payload.publicMetadata as Record<string, unknown> | undefined)?.role?.toString() ??
        this.config.defaultRole ??
        'viewer'

      return {
        id: payload.sub,
        email: (payload as { email?: string }).email ?? '',
        role,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Clerk token verification failed'
      throw new UnauthorizedException(message)
    }
  }

  /**
   * Clerk manages login externally — this endpoint is not applicable.
   */
  async login(_credentials: LoginCredentials): Promise<AuthResult> {
    throw new UnauthorizedException(CLERK_NOT_SUPPORTED)
  }

  /**
   * Clerk manages registration externally — this endpoint is not applicable.
   */
  async register(_data: RegisterData): Promise<AuthUser> {
    throw new UnauthorizedException(CLERK_NOT_SUPPORTED)
  }

  /**
   * Clerk manages credentials externally — direct validation is not applicable.
   */
  async validateCredentials(_email: string, _password: string): Promise<AuthUser | null> {
    throw new UnauthorizedException(CLERK_NOT_SUPPORTED)
  }

  getPassportStrategyName(): string {
    return 'clerk'
  }

  /**
   * Check if any users exist in Clerk.
   * Requires secretKey to be configured.
   */
  async hasUsers(): Promise<boolean> {
    if (!this.config.secretKey) {
      return false
    }

    try {
      const clerk = createClerkClient({ secretKey: this.config.secretKey })
      const result = await clerk.users.getUserList({ limit: 1 })
      return result.totalCount > 0
    } catch {
      return false
    }
  }

  /**
   * Get auth info by querying the Clerk Backend API for instance configuration.
   * Returns which social login providers are enabled.
   */
  async getAuthInfo(): Promise<ExternalAuthInfo> {
    const fallback: ExternalAuthInfo = {
      strategy: 'clerk',
      isExternal: true,
      providers: [],
    }

    if (!this.config.secretKey) {
      return fallback
    }

    try {
      // Clerk SDK does not expose a direct "list social providers" method.
      // Use the low-level fetch to get instance configuration.
      const response = await fetch('https://api.clerk.com/v1/instance', {
        headers: { Authorization: `Bearer ${this.config.secretKey}` },
      })

      if (!response.ok) {
        return fallback
      }

      const instance = (await response.json()) as {
        social_login_enabled?: boolean
        social_providers?: string[]
        [key: string]: unknown
      }

      const providers = instance.social_providers ?? []

      return {
        strategy: 'clerk',
        isExternal: true,
        providers,
        providerSettings: {
          socialLoginEnabled: instance.social_login_enabled,
        },
      }
    } catch {
      return fallback
    }
  }

  /**
   * Extract Bearer token from Authorization header or __session cookie.
   */
  private extractToken(req: {
    headers: { authorization?: string; cookie?: string }
  }): string | null {
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7)
    }

    // Fall back to __session cookie (Clerk's default cookie name)
    const cookie = req.headers.cookie
    if (cookie) {
      const match = /(?:^|;\s*)__session=([^;]+)/.exec(cookie)
      if (match?.[1]) return match[1]
    }

    return null
  }

  /** Environment variables used by this adapter */
  static readonly envVars: EnvVarRequirement[] = [
    {
      name: 'CLERK_SECRET_KEY',
      required: true,
      description: 'Clerk secret key',
    },
    {
      name: 'CLERK_PUBLISHABLE_KEY',
      required: false,
      description: 'Clerk publishable key',
    },
    {
      name: 'CLERK_JWT_KEY',
      required: false,
      description: 'Clerk JWT public key (PEM) for networkless verification',
    },
  ]

  /**
   * Create a configured auth provider for MagnetModule.forRoot().
   * Auto-resolves config values from environment variables if not provided.
   * Registers the Clerk strategy internally.
   */
  static forRoot(config?: Partial<ClerkAuthConfig>): AuthMagnetProvider {
    const resolvedConfig: AuthConfig = {
      strategy: 'clerk',
      ...(config ?? {}),
    }

    // Register strategy so AuthModule finds it — lazy import to avoid circular deps
    try {
      const { AuthStrategyFactory } = require('@magnet-cms/core')
      AuthStrategyFactory.registerStrategy('clerk', ClerkAuthStrategy)
    } catch {
      // Core not available — strategy will be registered when AuthModule loads
    }

    return {
      type: 'auth',
      config: resolvedConfig,
      envVars: ClerkAuthStrategy.envVars,
    }
  }
}
