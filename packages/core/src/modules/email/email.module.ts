import type { EmailAdapter } from '@magnet-cms/common'
import { DynamicModule, Logger, Module, forwardRef } from '@nestjs/common'
import { DatabaseModule } from '~/modules/database'
import { InternationalizationModule } from '~/modules/database/modules/internationalization/internationalization.module'
import { SettingsModule } from '~/modules/settings'
import { UserModule } from '~/modules/user/user.module'
import { ConsoleEmailAdapter } from './adapters/console-email.adapter'
import { EmailTemplateController } from './email-template.controller'
import { EmailTemplateService } from './email-template.service'
import { EmailVerificationService } from './email-verification.service'
import { EmailController } from './email.controller'
import { EMAIL_ADAPTER_TOKEN, EmailService } from './email.service'
import { EmailSettings } from './email.settings'
import { EmailTemplate } from './schemas/email-template.schema'
import { EmailVerification } from './schemas/email-verification.schema'
import { TemplateService } from './template.service'

const logger = new Logger('EmailModule')

@Module({})
export class EmailModule {
	/** Injection token for the email layout component */
	static readonly EMAIL_LAYOUT_TOKEN = 'EMAIL_LAYOUT'

	/**
	 * Configure the email module with an adapter instance.
	 *
	 * Always wraps the provided adapter (or null) with a ConsoleEmailAdapter
	 * that logs email summaries. When no adapter is provided, emails are
	 * logged to console only.
	 *
	 * @param adapter - Email adapter instance (from provider), or null for console-only
	 * @param defaults - Default email settings (from, replyTo)
	 * @param options - Additional options including React Email layout component
	 */
	static forRoot(
		adapter?: EmailAdapter | null,
		defaults?: { from?: string; replyTo?: string } | null,
		options?: { layout?: unknown },
	): DynamicModule {
		const providers = [
			TemplateService,
			EmailService,
			EmailVerificationService,
			EmailTemplateService,
		]

		if (adapter) {
			logger.log(`Email module initialized with '${adapter.name}' adapter`)
		} else {
			logger.log('Email module initialized without adapter (console-only mode)')
		}

		if (defaults) {
			providers.push({
				provide: 'EMAIL_DEFAULTS',
				useValue: defaults,
			} as never)
		}

		// Provide layout component (null when not configured — TemplateService falls back to discovery/default)
		providers.push({
			provide: EmailModule.EMAIL_LAYOUT_TOKEN,
			useValue: options?.layout ?? null,
		} as never)

		// Always wrap with ConsoleEmailAdapter for logging
		const consoleAdapter = new ConsoleEmailAdapter(logger, adapter ?? null)
		providers.push({
			provide: EMAIL_ADAPTER_TOKEN,
			useValue: consoleAdapter,
		} as never)

		return {
			module: EmailModule,
			global: true,
			imports: [
				DatabaseModule.forFeature(EmailVerification),
				DatabaseModule.forFeature(EmailTemplate),
				SettingsModule.forFeature(EmailSettings),
				InternationalizationModule,
				forwardRef(() => UserModule),
			],
			controllers: [EmailController, EmailTemplateController],
			providers,
			exports: [
				EmailService,
				TemplateService,
				EmailVerificationService,
				EmailTemplateService,
			],
		}
	}
}
