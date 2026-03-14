import type { EmailConfig } from '@magnet-cms/common'
import { DynamicModule, Logger, Module, forwardRef } from '@nestjs/common'
import { DatabaseModule } from '~/modules/database'
import { SettingsModule } from '~/modules/settings'
import { UserModule } from '~/modules/user/user.module'
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
	 * If no config is provided, the module still registers but email
	 * sending is disabled (EmailService no-ops gracefully).
	 */
	static forRoot(config?: EmailConfig): DynamicModule {
		const providers = [TemplateService, EmailService, EmailVerificationService]

		if (config) {
			try {
				const adapter = EmailAdapterFactory.create(config)

				providers.push({
					provide: EMAIL_ADAPTER_TOKEN,
					useValue: adapter,
				} as never)

				// Set defaults from config
				if (config.defaults) {
					providers.push({
						provide: 'EMAIL_DEFAULTS',
						useValue: config.defaults,
					} as never)
				}

				logger.log(`Email module initialized with '${config.adapter}' adapter`)
			} catch (error) {
				logger.warn(
					`Failed to initialize email adapter: ${error instanceof Error ? error.message : String(error)}. Email sending disabled.`,
				)
			}
		} else {
			logger.log(
				'Email module initialized without adapter (email sending disabled)',
			)
		}

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
