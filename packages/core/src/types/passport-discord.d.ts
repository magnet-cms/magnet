declare module 'passport-discord' {
  export interface Profile {
    id: string
    username: string
    discriminator: string
    global_name?: string
    avatar?: string
    email?: string
    verified?: boolean
    mfa_enabled?: boolean
    locale?: string
    flags?: number
    premium_type?: number
    public_flags?: number
  }

  export type VerifyCallback = (err: Error | null, user?: unknown) => void

  export interface StrategyOptions {
    clientID: string
    clientSecret: string
    callbackURL: string
    scope: string[]
    prompt?: string
  }

  export type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) => void

  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: VerifyFunction)
    authenticate(req: unknown, options?: unknown): void
  }
}
