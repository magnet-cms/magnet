import type { EmailAdapter, EmailConfig } from '@magnet-cms/common'
import { DynamicModule, Logger, Module, forwardRef } from '@nestjs/common'
import { DatabaseModule } from '~/modules/database'
import { SettingsModule } from '~/modules/settings'
import { UserModule } from '~/modules/user/user.module'
import { ConsoleEmailAdapter } from './adapters/console-email.adapter'
import { EmailAdapterFactory } from './email-adapter.factory'
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
	 * Configure the email module with an adapter.
	 *
	 * Always wraps the configured adapter (or null) with a ConsoleEmailAdapter
	 * that logs email summaries. When no config is provided, emails are
	 * logged to console only.
	 */
	static forRoot(config?: EmailConfig): DynamicModule {
		const providers = [TemplateService, EmailService, EmailVerificationService]

		let innerAdapter: EmailAdapter | null = null

		if (config) {
			try {
				innerAdapter = EmailAdapterFactory.create(config)
				logger.log(`Email module initialized with '${config.adapter}' adapter`)
			} catch (error) {
				logger.warn(
					`Failed to initialize email adapter: ${error instanceof Error ? error.message : String(error)}. Falling back to console-only.`,
				)
			}

			// Set defaults from config
			if (config.defaults) {
				providers.push({
					provide: 'EMAIL_DEFAULTS',
					useValue: config.defaults,
				} as never)
			}
		} else {
			logger.log('Email module initialized without adapter (console-only mode)')
		}

		// Always wrap with ConsoleEmailAdapter for logging
		const consoleAdapter = new ConsoleEmailAdapter(logger, innerAdapter)
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
