import type { EmailAdapter } from '@magnet-cms/common'
import { DynamicModule, Logger, Module, forwardRef } from '@nestjs/common'
import { DatabaseModule } from '~/modules/database'
import { SettingsModule } from '~/modules/settings'
import { UserModule } from '~/modules/user/user.module'
import { ConsoleEmailAdapter } from './adapters/console-email.adapter'
import { EmailVerificationService } from './email-verification.service'
import { EmailController } from './email.controller'
import { EMAIL_ADAPTER_TOKEN, EmailService } from './email.service'
import { EmailSettings } from './email.settings'
import { EmailVerification } from './schemas/email-verification.schema'
import { TemplateService } from './template.service'

const logger = new Logger('EmailModule')

@Module({})
export class EmailModule {
	/**
	 * Configure the email module with an adapter instance.
	 *
	 * Always wraps the provided adapter (or null) with a ConsoleEmailAdapter
	 * that logs email summaries. When no adapter is provided, emails are
	 * logged to console only.
	 *
	 * @param adapter - Email adapter instance (from provider), or null for console-only
	 * @param defaults - Default email settings (from, replyTo)
	 */
	static forRoot(
		adapter?: EmailAdapter | null,
		defaults?: { from?: string; replyTo?: string } | null,
	): DynamicModule {
		const providers = [TemplateService, EmailService, EmailVerificationService]

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
				SettingsModule.forFeature(EmailSettings),
				forwardRef(() => UserModule),
			],
			controllers: [EmailController],
			providers,
			exports: [EmailService, TemplateService, EmailVerificationService],
		}
	}
}
