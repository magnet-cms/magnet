import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { Injectable } from '@nestjs/common'
import Handlebars from 'handlebars'
import { MagnetLogger } from '~/modules/logging/logger.service'

/**
 * Service for rendering Handlebars email templates.
 *
 * Loads `.hbs` files from the templates directory, compiles them once,
 * and caches the compiled templates for performance.
 */
@Injectable()
export class TemplateService {
	private readonly templates = new Map<string, Handlebars.TemplateDelegate>()
	private readonly templatesDir: string

	constructor(private readonly logger: MagnetLogger) {
		this.logger.setContext(TemplateService.name)
		this.templatesDir = join(__dirname, 'templates')
		this.loadTemplates()
	}

	/**
	 * Render a template by name with the given context variables.
	 *
	 * @param templateName - Template name (without .hbs extension)
	 * @param context - Template variables
	 * @returns Rendered HTML string
	 */
	render(templateName: string, context: Record<string, unknown>): string {
		const template = this.templates.get(templateName)
		if (!template) {
			this.logger.warn(`Email template '${templateName}' not found`)
			return ''
		}

		try {
			const content = template(context)

			// Wrap in base layout if available
			const layout = this.templates.get('base-layout')
			if (layout && templateName !== 'base-layout') {
				return layout({ ...context, content })
			}

			return content
		} catch (error) {
			this.logger.error(
				`Failed to render template '${templateName}': ${error instanceof Error ? error.message : String(error)}`,
			)
			return ''
		}
	}

	/**
	 * Check if a template exists.
	 */
	has(templateName: string): boolean {
		return this.templates.has(templateName)
	}

	/**
	 * Register a custom template at runtime.
	 */
	register(name: string, source: string): void {
		this.templates.set(name, Handlebars.compile(source))
	}

	private loadTemplates(): void {
		try {
			const files = readdirSync(this.templatesDir)
			for (const file of files) {
				if (!file.endsWith('.hbs')) continue
				const name = file.replace('.hbs', '')
				const source = readFileSync(join(this.templatesDir, file), 'utf-8')
				this.templates.set(name, Handlebars.compile(source))
			}
			this.logger.log(`Loaded ${this.templates.size} email template(s)`)
		} catch (error) {
			this.logger.warn(
				`Failed to load email templates: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}
}
