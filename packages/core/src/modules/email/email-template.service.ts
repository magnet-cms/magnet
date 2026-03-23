import type { BaseSchema, Model } from '@magnet-cms/common'
import { InjectModel } from '@magnet-cms/common'
import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common'
import { InternationalizationService } from '~/modules/database/modules/internationalization/internationalization.service'
import { MagnetLogger } from '~/modules/logging/logger.service'
import type { EmailTemplateVersion } from './schemas/email-template.schema'
import { EmailTemplate } from './schemas/email-template.schema'

const MAX_VERSIONS = 5

// ============================================================================
// Default Seed Templates
// ============================================================================

const SEED_TEMPLATES: Array<{
	slug: string
	subject: string
	body: string
	category: string
	variables: string[]
}> = [
	{
		slug: 'welcome',
		subject: 'Welcome{{#if name}}, {{name}}{{/if}}!',
		body: `<h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">Welcome!</h2>
<p style="margin: 0 0 16px; color: #3f3f46; font-size: 14px; line-height: 1.6;">Hi{{#if userName}} {{userName}}{{/if}},</p>
<p style="margin: 0 0 24px; color: #3f3f46; font-size: 14px; line-height: 1.6;">Your account has been created successfully. You can now sign in and start using the application.</p>
<div style="text-align: center; margin: 0 0 24px;">
  <a href="{{loginUrl}}" style="display: inline-block; padding: 12px 24px; background-color: #18181b; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">Sign In</a>
</div>
<p style="margin: 0; color: #71717a; font-size: 12px; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:<br><a href="{{loginUrl}}" style="color: #3b82f6; word-break: break-all;">{{loginUrl}}</a></p>`,
		category: 'transactional',
		variables: ['userName', 'loginUrl'],
	},
	{
		slug: 'password-reset',
		subject: 'Reset Your Password',
		body: `<h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">Reset Your Password</h2>
<p style="margin: 0 0 16px; color: #3f3f46; font-size: 14px; line-height: 1.6;">Hi{{#if userName}} {{userName}}{{/if}},</p>
<p style="margin: 0 0 24px; color: #3f3f46; font-size: 14px; line-height: 1.6;">We received a request to reset your password. Click the button below to choose a new password. This link will expire in 1 hour.</p>
<div style="text-align: center; margin: 0 0 24px;">
  <a href="{{resetLink}}" style="display: inline-block; padding: 12px 24px; background-color: #18181b; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">Reset Password</a>
</div>
<p style="margin: 0 0 8px; color: #71717a; font-size: 12px; line-height: 1.5;">If you didn't request a password reset, you can safely ignore this email.</p>
<p style="margin: 0; color: #71717a; font-size: 12px; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:<br><a href="{{resetLink}}" style="color: #3b82f6; word-break: break-all;">{{resetLink}}</a></p>`,
		category: 'transactional',
		variables: ['userName', 'resetLink'],
	},
	{
		slug: 'email-verification',
		subject: 'Verify Your Email',
		body: `<h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">Verify Your Email</h2>
<p style="margin: 0 0 16px; color: #3f3f46; font-size: 14px; line-height: 1.6;">Hi{{#if userName}} {{userName}}{{/if}},</p>
<p style="margin: 0 0 24px; color: #3f3f46; font-size: 14px; line-height: 1.6;">Please verify your email address by clicking the button below. This link will expire in 24 hours.</p>
<div style="text-align: center; margin: 0 0 24px;">
  <a href="{{verifyLink}}" style="display: inline-block; padding: 12px 24px; background-color: #18181b; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">Verify Email</a>
</div>
<p style="margin: 0 0 8px; color: #71717a; font-size: 12px; line-height: 1.5;">If you didn't create an account, you can safely ignore this email.</p>
<p style="margin: 0; color: #71717a; font-size: 12px; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:<br><a href="{{verifyLink}}" style="color: #3b82f6; word-break: break-all;">{{verifyLink}}</a></p>`,
		category: 'transactional',
		variables: ['userName', 'verifyLink'],
	},
	{
		slug: 'invite-user',
		subject: 'You have been invited to {{appName}}',
		body: `<h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">You're Invited!</h2>
<p style="margin: 0 0 16px; color: #3f3f46; font-size: 14px; line-height: 1.6;">Hi{{#if name}} {{name}}{{/if}},</p>
<p style="margin: 0 0 24px; color: #3f3f46; font-size: 14px; line-height: 1.6;">{{inviterName}} has invited you to join {{appName}}. Click the button below to accept the invitation and create your account.</p>
<div style="text-align: center; margin: 0 0 24px;">
  <a href="{{inviteUrl}}" style="display: inline-block; padding: 12px 24px; background-color: #18181b; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">Accept Invitation</a>
</div>
<p style="margin: 0 0 8px; color: #71717a; font-size: 12px; line-height: 1.5;">This invitation will expire in 7 days. If you weren't expecting this invitation, you can safely ignore this email.</p>
<p style="margin: 0; color: #71717a; font-size: 12px; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:<br><a href="{{inviteUrl}}" style="color: #3b82f6; word-break: break-all;">{{inviteUrl}}</a></p>`,
		category: 'transactional',
		variables: ['name', 'inviterName', 'appName', 'inviteUrl'],
	},
	{
		slug: 'content-published',
		subject: '{{contentTitle}} has been published',
		body: `<h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">Content Published</h2>
<p style="margin: 0 0 16px; color: #3f3f46; font-size: 14px; line-height: 1.6;">Hi{{#if userName}} {{userName}}{{/if}},</p>
<p style="margin: 0 0 24px; color: #3f3f46; font-size: 14px; line-height: 1.6;">Your content <strong>{{contentTitle}}</strong> has been published successfully and is now live.</p>
<div style="text-align: center; margin: 0 0 24px;">
  <a href="{{contentUrl}}" style="display: inline-block; padding: 12px 24px; background-color: #18181b; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">View Content</a>
</div>
<p style="margin: 0; color: #71717a; font-size: 12px; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:<br><a href="{{contentUrl}}" style="color: #3b82f6; word-break: break-all;">{{contentUrl}}</a></p>`,
		category: 'system',
		variables: ['userName', 'contentTitle', 'contentUrl'],
	},
]

// ============================================================================
// DTOs
// ============================================================================

export interface CreateEmailTemplateData {
	slug: string
	subject: string
	body: string
	category?: string
	locale?: string
	variables?: string[]
	active?: boolean
	createdBy?: string
}

export interface UpdateEmailTemplateData {
	subject?: string
	body?: string
	category?: string
	variables?: string[]
	active?: boolean
	updatedBy?: string
}

export interface EmailTemplateFilters {
	category?: string
	locale?: string
	search?: string
	active?: boolean
}

// ============================================================================
// Service
// ============================================================================

/**
 * Service for managing database-stored email templates.
 *
 * Handles CRUD operations, embedded version tracking (last 5 edits),
 * locale-aware resolution, and automatic seeding of default templates.
 */
@Injectable()
export class EmailTemplateService implements OnModuleInit {
	constructor(
		@InjectModel(EmailTemplate)
		private readonly templateModel: Model<EmailTemplate>,
		private readonly i18n: InternationalizationService,
		private readonly logger: MagnetLogger,
	) {
		this.logger.setContext(EmailTemplateService.name)
	}

	async onModuleInit(): Promise<void> {
		try {
			await this.seedDefaults()
		} catch (error) {
			this.logger.warn(
				`Failed to seed default email templates: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	// --------------------------------------------------------------------------
	// CRUD
	// --------------------------------------------------------------------------

	/**
	 * List all email templates with optional filters.
	 */
	async findAll(
		filters?: EmailTemplateFilters,
	): Promise<BaseSchema<EmailTemplate>[]> {
		const all = await this.templateModel.find()
		return this.applyFilters(all, filters)
	}

	/**
	 * Find a template by slug with locale resolution.
	 * Resolution order: exact locale → default locale → first available.
	 */
	async findBySlug(
		slug: string,
		locale?: string,
	): Promise<BaseSchema<EmailTemplate> | null> {
		const all = await this.templateModel.findMany({ slug } as Partial<
			BaseSchema<EmailTemplate>
		>)
		if (!all || all.length === 0) return null

		const targetLocale = locale || this.i18n.getDefaultLocale()

		// Exact locale match
		const exact = all.find((t) => t.locale === targetLocale)
		if (exact) return exact

		// Default locale fallback
		const defaultLocale = this.i18n.getDefaultLocale()
		const defaultMatch = all.find((t) => t.locale === defaultLocale)
		if (defaultMatch) return defaultMatch

		// First available
		return all[0] ?? null
	}

	/**
	 * Find all locale variants for a given slug.
	 * Returns every template row that shares the same slug (one per locale).
	 */
	async findBySlugAllLocales(
		slug: string,
	): Promise<BaseSchema<EmailTemplate>[]> {
		const all = await this.templateModel.findMany({ slug } as Partial<
			BaseSchema<EmailTemplate>
		>)
		return all ?? []
	}

	/**
	 * Find a template by ID.
	 */
	async findById(id: string): Promise<BaseSchema<EmailTemplate> | null> {
		return this.templateModel.findById(id)
	}

	/**
	 * Create a new email template.
	 * Validates that slug + locale combination does not already exist.
	 */
	async create(
		data: CreateEmailTemplateData,
	): Promise<BaseSchema<EmailTemplate>> {
		const locale = data.locale || 'en'

		// Check compound uniqueness: slug + locale
		const existing = await this.templateModel.findMany({
			slug: data.slug,
		} as Partial<BaseSchema<EmailTemplate>>)
		if (existing?.some((t) => t.locale === locale)) {
			throw new BadRequestException(
				`Email template with slug '${data.slug}' and locale '${locale}' already exists`,
			)
		}

		return this.templateModel.create({
			slug: data.slug,
			subject: data.subject,
			body: data.body,
			category: data.category || 'transactional',
			locale,
			variables: data.variables || [],
			versions: [],
			active: data.active ?? true,
			createdBy: data.createdBy || '',
			updatedBy: data.createdBy || '',
			createdAt: new Date(),
			updatedAt: new Date(),
		})
	}

	/**
	 * Update a template, pushing current content to version history first.
	 * Version history is capped at MAX_VERSIONS (5).
	 */
	async update(
		id: string,
		data: UpdateEmailTemplateData,
	): Promise<BaseSchema<EmailTemplate> | null> {
		const existing = await this.templateModel.findById(id)
		if (!existing) return null

		// Push current version to history before updating
		const newVersion: EmailTemplateVersion = {
			subject: existing.subject,
			body: existing.body,
			editedBy: data.updatedBy || existing.updatedBy || '',
			editedAt: new Date().toISOString(),
		}

		const versions = [...(existing.versions || []), newVersion]
		// Cap at MAX_VERSIONS — drop oldest first
		if (versions.length > MAX_VERSIONS) {
			versions.splice(0, versions.length - MAX_VERSIONS)
		}

		return this.templateModel.update(
			{ id },
			{
				...(data.subject !== undefined && { subject: data.subject }),
				...(data.body !== undefined && { body: data.body }),
				...(data.category !== undefined && { category: data.category }),
				...(data.variables !== undefined && { variables: data.variables }),
				...(data.active !== undefined && { active: data.active }),
				updatedBy: data.updatedBy || existing.updatedBy,
				versions,
				updatedAt: new Date(),
			},
		)
	}

	/**
	 * Delete a template by ID.
	 */
	async delete(id: string): Promise<boolean> {
		return this.templateModel.delete({ id } as Partial<
			BaseSchema<EmailTemplate>
		>)
	}

	// --------------------------------------------------------------------------
	// Seeding
	// --------------------------------------------------------------------------

	/**
	 * Seed default templates if none exist yet.
	 */
	private async seedDefaults(): Promise<void> {
		const existing = await this.templateModel.find()
		if (existing && existing.length > 0) {
			return // Already seeded
		}

		const defaultLocale = this.i18n.getDefaultLocale()

		this.logger.log(
			`Seeding ${SEED_TEMPLATES.length} default email templates (locale: ${defaultLocale})`,
		)

		for (const template of SEED_TEMPLATES) {
			try {
				await this.templateModel.create({
					slug: template.slug,
					subject: template.subject,
					body: template.body,
					category: template.category,
					locale: defaultLocale,
					variables: template.variables,
					versions: [],
					active: true,
					createdBy: 'system',
					updatedBy: 'system',
					createdAt: new Date(),
					updatedAt: new Date(),
				})
			} catch (error) {
				this.logger.warn(
					`Failed to seed template '${template.slug}': ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}

		this.logger.log('Default email templates seeded successfully')
	}

	// --------------------------------------------------------------------------
	// Helpers
	// --------------------------------------------------------------------------

	private applyFilters(
		templates: BaseSchema<EmailTemplate>[],
		filters?: EmailTemplateFilters,
	): BaseSchema<EmailTemplate>[] {
		if (!filters) return templates

		let result = templates

		if (filters.category) {
			result = result.filter((t) => t.category === filters.category)
		}

		if (filters.locale) {
			result = result.filter((t) => t.locale === filters.locale)
		}

		if (filters.active !== undefined) {
			result = result.filter((t) => t.active === filters.active)
		}

		if (filters.search) {
			const search = filters.search.toLowerCase()
			result = result.filter(
				(t) =>
					t.slug.toLowerCase().includes(search) ||
					t.subject.toLowerCase().includes(search),
			)
		}

		return result
	}
}
