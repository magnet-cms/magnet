import type { EnvVarRequirement, PluginMagnetProvider } from '@magnet-cms/common'
import { Plugin } from '@magnet-cms/core'

import type { SentryPluginConfig } from './types'

/** Resolved type for optional runtime `require('@sentry/nestjs')` (single-line for DTS emit). */
type SentryNestJs = typeof import('@sentry/nestjs')

/**
 * Sentry Plugin for Magnet CMS
 *
 * Provides Sentry error tracking, performance monitoring, cron job
 * monitoring, and a user feedback widget.
 *
 * @example
 * ```typescript
 * MagnetModule.forRoot([
 *   MongooseDatabaseAdapter.forRoot(),
 *   SentryPlugin.forRoot({
 *     dsn: 'https://...@sentry.io/...',
 *     tracesSampleRate: 0.1,
 *   }),
 * ], { admin: true })
 * ```
 */
@Plugin({
  name: 'sentry',
  description: 'Sentry error tracking and performance monitoring for Magnet CMS',
  version: '0.1.0',
  module: () => require('./sentry.module').SentryModule,
  frontend: {
    routes: [
      {
        path: 'sentry',
        componentId: 'SentryDashboard',
        requiresAuth: true,
        children: [
          { path: '', componentId: 'SentryDashboard' },
          { path: 'issues', componentId: 'SentryIssues' },
          { path: 'settings', componentId: 'SentrySettings' },
        ],
      },
    ],
    sidebar: [
      {
        id: 'sentry',
        title: 'Sentry',
        url: '/sentry',
        icon: 'AlertTriangle',
        order: 80,
        items: [
          {
            id: 'sentry-dashboard',
            title: 'Dashboard',
            url: '/sentry',
            icon: 'BarChart3',
          },
          {
            id: 'sentry-issues',
            title: 'Issues',
            url: '/sentry/issues',
            icon: 'Bug',
          },
          {
            id: 'sentry-projects',
            title: 'Projects',
            url: '/sentry/projects',
            icon: 'FolderKanban',
          },
          {
            id: 'sentry-settings',
            title: 'Settings',
            url: '/sentry/settings',
            icon: 'Settings',
          },
        ],
      },
    ],
  },
})
export class SentryPlugin {
  /** Resolved configuration — stored statically so lifecycle hooks can access it */
  static _resolvedConfig: SentryPluginConfig | undefined

  /** Environment variables used by this plugin */
  static readonly envVars: EnvVarRequirement[] = [
    {
      name: 'SENTRY_DSN',
      required: true,
      description: 'Sentry Data Source Name (DSN) for error reporting',
    },
  ]

  /**
   * Create a configured plugin provider for MagnetModule.forRoot().
   *
   * Auto-resolves DSN from the SENTRY_DSN environment variable if not provided.
   *
   * @example
   * ```typescript
   * SentryPlugin.forRoot({
   *   tracesSampleRate: 0.1,
   *   environment: 'production',
   * })
   * ```
   */
  static forRoot(config?: Partial<SentryPluginConfig>): PluginMagnetProvider {
    const resolvedConfig: SentryPluginConfig = {
      dsn: config?.dsn ?? process.env.SENTRY_DSN,
      tracesSampleRate: config?.tracesSampleRate ?? 0.1,
      profileSessionSampleRate: config?.profileSessionSampleRate ?? 1.0,
      environment:
        config?.environment ??
        process.env.SENTRY_ENVIRONMENT ??
        process.env.NODE_ENV ??
        'development',
      release: config?.release ?? process.env.SENTRY_RELEASE,
      debug: config?.debug ?? false,
      enabled: config?.enabled ?? true,
      attachStacktrace: config?.attachStacktrace ?? true,
      maxBreadcrumbs: config?.maxBreadcrumbs ?? 100,
      authToken: config?.authToken ?? process.env.SENTRY_AUTH_TOKEN,
      organization: config?.organization ?? process.env.SENTRY_ORG,
      project: config?.project ?? process.env.SENTRY_PROJECT,
      sentryUrl: config?.sentryUrl ?? process.env.SENTRY_URL,
    }

    // Store on static field so onPluginInit() and SentryModule can access it
    // without needing NestJS DI at that point in the lifecycle.
    SentryPlugin._resolvedConfig = resolvedConfig

    return {
      type: 'plugin',
      plugin: SentryPlugin,
      options: { ...resolvedConfig },
      envVars: SentryPlugin.envVars,
    }
  }

  /**
   * Called by the plugin lifecycle service after NestJS module initialization.
   * Initializes the Sentry SDK if not already initialized (e.g., via instrument.ts).
   *
   * NOTE: For full performance auto-instrumentation (HTTP, DB query tracing),
   * initialize Sentry before NestJS bootstrap by importing `instrument.ts`
   * at the top of main.ts and calling `initSentryInstrumentation()`.
   * Late initialization still captures errors and breadcrumbs correctly.
   */
  async onPluginInit(): Promise<void> {
    const config = SentryPlugin._resolvedConfig
    if (!config?.enabled) return

    try {
      const Sentry = require('@sentry/nestjs') as SentryNestJs

      // Skip if already initialized (e.g., via instrument.ts early init)
      if (Sentry.getClient()) return

      Sentry.init({
        dsn: config.dsn,
        tracesSampleRate: config.tracesSampleRate,
        environment: config.environment,
        release: config.release,
        debug: config.debug,
        enabled: config.enabled,
        attachStacktrace: config.attachStacktrace,
        maxBreadcrumbs: config.maxBreadcrumbs,
      })
    } catch {
      // @sentry/nestjs is not installed — no-op
    }
  }

  /**
   * Called when the application shuts down.
   * Flushes pending Sentry events before exit.
   */
  async onPluginDestroy(): Promise<void> {
    try {
      const Sentry = require('@sentry/nestjs') as SentryNestJs
      await Sentry.close(2000)
    } catch {
      // @sentry/nestjs not installed or already closed — no-op
    }
  }
}
