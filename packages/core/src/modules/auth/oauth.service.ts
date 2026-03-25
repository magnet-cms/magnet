import type { EventPayload } from '@magnet-cms/common'
import { OnEvent } from '@magnet-cms/common'
import { Injectable, OnModuleInit } from '@nestjs/common'
import * as passport from 'passport'
import { Strategy as DiscordStrategy } from 'passport-discord'
import { Strategy as FacebookStrategy } from 'passport-facebook'
import { Strategy as GithubStrategy } from 'passport-github2'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'

import { AuthSettings } from './auth.settings'
import type { OAuthProfile } from './strategies/google.strategy'

import { MagnetLogger } from '~/modules/logging/logger.service'
import { SettingsService } from '~/modules/settings'

/**
 * OAuthService manages the dynamic registration of OAuth Passport strategies.
 *
 * On module init it reads credentials from AuthSettings (DB) and calls
 * `passport.use(name, strategy)` for every provider that has a clientId and
 * clientSecret configured. When credentials are updated via the admin UI the
 * `settings.group_updated` event triggers a re-registration so the new
 * credentials take effect immediately without a restart.
 *
 * `getActiveProviders()` returns the list of providers currently registered,
 * which is exposed through GET /auth/status so the admin UI knows which
 * provider buttons to render.
 */
@Injectable()
export class OAuthService implements OnModuleInit {
  /** Tracks provider names that have a strategy registered in Passport. */
  private activeProviders: Set<string> = new Set()

  constructor(
    private readonly settingsService: SettingsService,
    private readonly logger: MagnetLogger,
  ) {
    this.logger.setContext(OAuthService.name)
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.registerStrategies()
    } catch (error) {
      this.logger.warn(
        `OAuth strategies could not be registered at startup: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Re-registers strategies whenever OAuth settings are saved through the UI.
   */
  @OnEvent('settings.group_updated', { async: true })
  async onSettingsGroupUpdated(payload: EventPayload<'settings.group_updated'>): Promise<void> {
    if (payload.group === 'oauth') {
      await this.registerStrategies()
    }
  }

  /**
   * Reads OAuth credentials from AuthSettings and registers a Passport strategy for each
   * provider that has a non-empty clientId and clientSecret.
   * Existing strategies are replaced when credentials change.
   */
  async registerStrategies(): Promise<void> {
    const settings = await this.settingsService.get(AuthSettings)
    const newActive = new Set<string>()

    // ---- Google ----
    if (settings.googleClientId && settings.googleClientSecret) {
      passport.use(
        'google',
        new GoogleStrategy(
          {
            clientID: settings.googleClientId,
            clientSecret: settings.googleClientSecret,
            callbackURL: settings.googleCallbackURL,
            scope: ['email', 'profile'],
          },
          (
            _accessToken: string,
            _refreshToken: string,
            profile: {
              id: string
              emails?: Array<{ value: string }>
              displayName?: string
            },
            done: (err: Error | null, user?: OAuthProfile) => void,
          ) => {
            const email: string = profile.emails?.[0]?.value ?? ''
            done(null, {
              id: profile.id,
              email,
              name: profile.displayName ?? email.split('@')[0] ?? '',
              provider: 'google',
            })
          },
        ),
      )
      newActive.add('google')
      this.logger.log('Google OAuth strategy registered')
    }

    // ---- GitHub ----
    if (settings.githubClientId && settings.githubClientSecret) {
      passport.use(
        'github',
        new GithubStrategy(
          {
            clientID: settings.githubClientId,
            clientSecret: settings.githubClientSecret,
            callbackURL: settings.githubCallbackURL,
            scope: ['user:email'],
          },
          (
            _accessToken: string,
            _refreshToken: string,
            profile: {
              id: string
              emails?: Array<{ value: string }>
              displayName?: string
              username?: string
            },
            done: (err: Error | null, user?: OAuthProfile) => void,
          ) => {
            const email: string = profile.emails?.[0]?.value ?? ''
            done(null, {
              id: profile.id,
              email,
              name: profile.displayName ?? profile.username ?? email.split('@')[0] ?? '',
              provider: 'github',
            })
          },
        ),
      )
      newActive.add('github')
      this.logger.log('GitHub OAuth strategy registered')
    }

    // ---- Facebook ----
    if (settings.facebookClientId && settings.facebookClientSecret) {
      passport.use(
        'facebook',
        new FacebookStrategy(
          {
            clientID: settings.facebookClientId,
            clientSecret: settings.facebookClientSecret,
            callbackURL: settings.facebookCallbackURL,
            profileFields: ['id', 'emails', 'displayName'],
          },
          (
            _accessToken: string,
            _refreshToken: string,
            profile: {
              id: string
              emails?: Array<{ value: string }>
              displayName?: string
            },
            done: (err: Error | null, user?: OAuthProfile) => void,
          ) => {
            const email: string = profile.emails?.[0]?.value ?? ''
            done(null, {
              id: profile.id,
              email,
              name: profile.displayName ?? email.split('@')[0] ?? '',
              provider: 'facebook',
            })
          },
        ),
      )
      newActive.add('facebook')
      this.logger.log('Facebook OAuth strategy registered')
    }

    // ---- Discord ----
    if (settings.discordClientId && settings.discordClientSecret) {
      passport.use(
        'discord',
        new DiscordStrategy(
          {
            clientID: settings.discordClientId,
            clientSecret: settings.discordClientSecret,
            callbackURL: settings.discordCallbackURL,
            scope: ['identify', 'email'],
          },
          (
            _accessToken: string,
            _refreshToken: string,
            profile: {
              id: string
              email?: string
              username?: string
              global_name?: string
            },
            done: (err: Error | null, user?: OAuthProfile) => void,
          ) => {
            const email: string = profile.email ?? ''
            done(null, {
              id: profile.id,
              email,
              name: profile.global_name ?? profile.username ?? email.split('@')[0] ?? '',
              provider: 'discord',
            })
          },
        ),
      )
      newActive.add('discord')
      this.logger.log('Discord OAuth strategy registered')
    }

    // Unregister providers whose credentials were removed
    for (const provider of this.activeProviders) {
      if (!newActive.has(provider)) {
        passport.unuse(provider)
        this.logger.log(`${provider} OAuth strategy unregistered (credentials removed)`)
      }
    }

    this.activeProviders = newActive
  }

  /**
   * Returns the names of OAuth providers that are currently registered in
   * Passport (i.e., have credentials configured in AuthSettings).
   *
   * This list is returned in GET /auth/status so the admin UI knows which
   * provider buttons to show on the login/signup forms.
   */
  async getActiveProviders(): Promise<string[]> {
    // Re-read from settings on each call to pick up recent changes
    try {
      const settings = await this.settingsService.get(AuthSettings)
      const providers: string[] = []
      if (settings.googleClientId && settings.googleClientSecret) providers.push('google')
      if (settings.githubClientId && settings.githubClientSecret) providers.push('github')
      if (settings.facebookClientId && settings.facebookClientSecret) providers.push('facebook')
      if (settings.discordClientId && settings.discordClientSecret) providers.push('discord')
      return providers
    } catch {
      return Array.from(this.activeProviders)
    }
  }
}
