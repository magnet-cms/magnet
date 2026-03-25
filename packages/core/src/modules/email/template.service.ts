import { existsSync } from 'node:fs'

import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common'
import { Body, Container, Html } from '@react-email/components'
import { render as renderEmail } from '@react-email/render'
import Handlebars from 'handlebars'
import React from 'react'

import { EmailTemplateService } from './email-template.service'

import { MagnetLogger } from '~/modules/logging/logger.service'

type LayoutComponent = (props: Record<string, unknown>) => React.ReactElement | null

export const EMAIL_LAYOUT_TOKEN = 'EMAIL_LAYOUT'

/**
 * Service for rendering email templates.
 *
 * Fetches message templates from the database (managed via EmailTemplateService),
 * compiles body content with Handlebars, then wraps in a React Email layout.
 *
 * Layout resolution order:
 *  1. Programmatically set via `setLayout()` (from MagnetModule.forRoot)
 *  2. Convention path: `${process.cwd()}/templates/email/layout` (dynamic import)
 *  3. Built-in default layout using @react-email/components
 */
@Injectable()
export class TemplateService implements OnModuleInit {
  /** In-memory registry for programmatically registered templates (backward compat) */
  private readonly templates = new Map<string, Handlebars.TemplateDelegate>()
  private layoutComponent: LayoutComponent | null = null

  constructor(
    private readonly logger: MagnetLogger,
    private readonly emailTemplateService: EmailTemplateService,
    @Optional()
    @Inject(EMAIL_LAYOUT_TOKEN)
    private readonly injectedLayout: unknown,
  ) {
    this.logger.setContext(TemplateService.name)
  }

  async onModuleInit(): Promise<void> {
    // Use programmatically provided layout first
    if (this.injectedLayout && typeof this.injectedLayout === 'function') {
      this.layoutComponent = this.injectedLayout as LayoutComponent
      this.logger.log('Email layout component configured via module options')
      return
    }
    // Fall back to convention-path discovery
    if (!this.layoutComponent) {
      await this.discoverLayout()
    }
  }

  /**
   * Set a layout component programmatically (called from EmailModule configuration).
   */
  setLayout(component: LayoutComponent): void {
    this.layoutComponent = component
    this.logger.log('Email layout component configured programmatically')
  }

  /**
   * Render an email template by slug.
   *
   * Resolution order:
   *  1. DB template via EmailTemplateService (locale-aware)
   *  2. In-memory registered templates (register() backward compat)
   *
   * @param slug - Template slug (e.g. 'welcome', 'password-reset')
   * @param context - Handlebars interpolation variables
   * @param locale - Optional locale for template resolution
   * @returns Rendered HTML string (layout + compiled body)
   */
  async render(slug: string, context: Record<string, unknown>, locale?: string): Promise<string> {
    try {
      // Try DB first
      const template = await this.emailTemplateService.findBySlug(slug, locale)

      if (template) {
        const compiledBody = Handlebars.compile(template.body)(context)
        return this.wrapInLayout(compiledBody, context)
      }

      // Fall back to in-memory registered templates
      const compiled = this.templates.get(slug)
      if (compiled) {
        const body = compiled(context)
        return this.wrapInLayout(body, context)
      }

      this.logger.warn(`Email template '${slug}' not found in DB or registry`)
      return ''
    } catch (error) {
      this.logger.error(
        `Failed to render template '${slug}': ${error instanceof Error ? error.message : String(error)}`,
      )
      return ''
    }
  }

  /**
   * Check if a template exists in the in-memory registry.
   */
  has(name: string): boolean {
    return this.templates.has(name)
  }

  /**
   * Register a custom template at runtime from a Handlebars source string.
   * Used for backward compatibility and programmatic template registration.
   */
  register(name: string, source: string): void {
    this.templates.set(name, Handlebars.compile(source))
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private async wrapInLayout(
    compiledBody: string,
    context: Record<string, unknown>,
  ): Promise<string> {
    if (this.layoutComponent) {
      const element = React.createElement(
        this.layoutComponent as React.ComponentType<Record<string, unknown>>,
        { content: compiledBody, ...context },
      )
      return renderEmail(element as React.ReactElement)
    }
    return this.renderDefaultLayout(compiledBody)
  }

  private async renderDefaultLayout(compiledBody: string): Promise<string> {
    const element = React.createElement(
      Html,
      { lang: 'en' },
      React.createElement(
        Body,
        {
          style: {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            backgroundColor: '#f9fafb',
            margin: '0',
            padding: '0',
          },
        },
        React.createElement(
          Container,
          {
            style: {
              maxWidth: '600px',
              margin: '0 auto',
              padding: '40px 20px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
            },
          },
          React.createElement('div', {
            dangerouslySetInnerHTML: { __html: compiledBody },
          }),
        ),
      ),
    )
    return renderEmail(element as React.ReactElement)
  }

  private async discoverLayout(): Promise<void> {
    const cwd = process.cwd()
    const candidates = [
      `${cwd}/templates/email/layout.js`,
      `${cwd}/templates/email/layout.ts`,
      `${cwd}/templates/email/layout.tsx`,
      `${cwd}/dist/templates/email/layout.js`,
    ]
    const resolvedPath = candidates.find((p) => existsSync(p))

    if (!resolvedPath) {
      this.logger.debug('No custom email layout found — using built-in default layout')
      return
    }

    try {
      const mod = await import(resolvedPath)
      const component =
        (mod.default as LayoutComponent | undefined) ??
        (mod.Layout as LayoutComponent | undefined) ??
        (mod.layout as LayoutComponent | undefined)
      if (typeof component === 'function') {
        this.layoutComponent = component
        this.logger.log(`Email layout discovered at ${resolvedPath}`)
      } else {
        this.logger.warn(
          `Email layout file found at ${resolvedPath} but exports no valid component — using built-in default layout`,
        )
      }
    } catch (error) {
      this.logger.warn(
        `Failed to load email layout from ${resolvedPath}: ${error instanceof Error ? error.message : String(error)} — using built-in default layout`,
      )
    }
  }
}
