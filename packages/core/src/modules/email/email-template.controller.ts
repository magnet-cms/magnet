import type { BaseSchema } from '@magnet-cms/common'
import type { SendEmailResult } from '@magnet-cms/common'
import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	NotFoundException,
	Param,
	Post,
	Put,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common'
import type { Request } from 'express'
import Handlebars from 'handlebars'
import { RestrictedRoute } from '~/decorators/restricted.route'
import { DynamicAuthGuard } from '~/modules/auth/guards/dynamic-auth.guard'
import { EmailTemplateService } from './email-template.service'
import { EmailService } from './email.service'
import type { EmailTemplate } from './schemas/email-template.schema'
import { TemplateService } from './template.service'

// ============================================================================
// DTOs
// ============================================================================

interface CreateEmailTemplateDto {
	slug: string
	subject: string
	body: string
	category?: string
	locale?: string
	variables?: string[]
	active?: boolean
}

interface UpdateEmailTemplateDto {
	subject?: string
	body?: string
	category?: string
	variables?: string[]
	active?: boolean
}

interface ListEmailTemplatesQuery {
	category?: string
	locale?: string
	search?: string
	active?: string
}

interface PreviewEmailTemplateDto {
	data?: Record<string, unknown>
}

interface AuthenticatedUser {
	id: string
	email: string
	role: string
}

interface AuthenticatedRequest extends Request {
	user: AuthenticatedUser
}

// ============================================================================
// Controller
// ============================================================================

/**
 * Admin REST API for managing email templates.
 *
 * All endpoints require authentication (RestrictedRoute).
 * Provides CRUD, version history, live preview, and test-send operations.
 */
@Controller('email-templates')
@RestrictedRoute()
export class EmailTemplateController {
	constructor(
		private readonly emailTemplateService: EmailTemplateService,
		private readonly templateService: TemplateService,
		private readonly emailService: EmailService,
	) {}

	/**
	 * GET /email-templates
	 * List all templates with optional filters.
	 */
	@Get()
	async list(
		@Query() query: ListEmailTemplatesQuery,
	): Promise<BaseSchema<EmailTemplate>[]> {
		return this.emailTemplateService.findAll({
			category: query.category,
			locale: query.locale,
			search: query.search,
			active: query.active !== undefined ? query.active === 'true' : undefined,
		})
	}

	/**
	 * GET /email-templates/by-slug/:slug
	 * Get all locale variants for a template slug.
	 * IMPORTANT: Declared before `:id` so NestJS registers it first.
	 */
	@Get('by-slug/:slug')
	async findBySlugAllLocales(
		@Param('slug') slug: string,
	): Promise<BaseSchema<EmailTemplate>[]> {
		return this.emailTemplateService.findBySlugAllLocales(slug)
	}

	/**
	 * GET /email-templates/:id
	 * Get a single template by ID.
	 */
	@Get(':id')
	async findOne(@Param('id') id: string): Promise<BaseSchema<EmailTemplate>> {
		const template = await this.emailTemplateService.findById(id)
		if (!template) throw new NotFoundException('Email template not found')
		return template
	}

	/**
	 * POST /email-templates
	 * Create a new email template.
	 */
	@Post()
	async create(
		@Body() dto: CreateEmailTemplateDto,
	): Promise<BaseSchema<EmailTemplate>> {
		return this.emailTemplateService.create({
			slug: dto.slug,
			subject: dto.subject,
			body: dto.body,
			category: dto.category,
			locale: dto.locale,
			variables: dto.variables,
			active: dto.active,
		})
	}

	/**
	 * PUT /email-templates/:id
	 * Update a template — triggers versioning of previous content.
	 */
	@Put(':id')
	async update(
		@Param('id') id: string,
		@Body() dto: UpdateEmailTemplateDto,
	): Promise<BaseSchema<EmailTemplate>> {
		const updated = await this.emailTemplateService.update(id, {
			subject: dto.subject,
			body: dto.body,
			category: dto.category,
			variables: dto.variables,
			active: dto.active,
		})
		if (!updated) throw new NotFoundException('Email template not found')
		return updated
	}

	/**
	 * DELETE /email-templates/:id
	 * Delete a template.
	 */
	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	async delete(@Param('id') id: string): Promise<void> {
		const template = await this.emailTemplateService.findById(id)
		if (!template) throw new NotFoundException('Email template not found')
		await this.emailTemplateService.delete(id)
	}

	/**
	 * GET /email-templates/:id/versions
	 * Get version history for a template.
	 */
	@Get(':id/versions')
	async getVersions(@Param('id') id: string) {
		const template = await this.emailTemplateService.findById(id)
		if (!template) throw new NotFoundException('Email template not found')
		return template.versions ?? []
	}

	/**
	 * POST /email-templates/:id/preview
	 * Render a preview of the template with sample data.
	 * Returns the fully composed HTML (layout + compiled body) and compiled subject.
	 */
	@Post(':id/preview')
	@HttpCode(HttpStatus.OK)
	async preview(
		@Param('id') id: string,
		@Body() dto: PreviewEmailTemplateDto,
	): Promise<{ html: string; subject: string }> {
		const template = await this.emailTemplateService.findById(id)
		if (!template) throw new NotFoundException('Email template not found')

		const data = dto.data ?? {}
		const html = await this.templateService.render(template.slug, data)
		const subject = Handlebars.compile(template.subject)(data)

		return { html, subject }
	}

	/**
	 * POST /email-templates/:id/test
	 * Send a test email to the currently authenticated admin's email address.
	 */
	@Post(':id/test')
	@HttpCode(HttpStatus.OK)
	@UseGuards(DynamicAuthGuard)
	async sendTest(
		@Param('id') id: string,
		@Body() dto: PreviewEmailTemplateDto,
		@Req() req: AuthenticatedRequest,
	): Promise<SendEmailResult | null> {
		const template = await this.emailTemplateService.findById(id)
		if (!template) throw new NotFoundException('Email template not found')

		return this.emailService.sendTemplate(template.slug, {
			to: req.user.email,
			data: dto.data ?? {},
		})
	}
}
