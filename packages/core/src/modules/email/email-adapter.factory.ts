import type { EmailAdapter, EmailConfig } from '@magnet-cms/common'
import { Logger } from '@nestjs/common'

const logger = new Logger('EmailAdapterFactory')

/**
 * Factory for creating email adapter instances from configuration.
 *
 * Uses dynamic require to load the adapter package by name,
 * following the same pattern as `database-adapter.factory.ts`.
 */
export class EmailAdapterFactory {
	static create(config: EmailConfig): EmailAdapter {
		const adapterName = config.adapter

		try {
			// Dynamic require: @magnet-cms/adapter-nodemailer or @magnet-cms/adapter-resend
			const adapterModule = require(`@magnet-cms/adapter-${adapterName}`)
			const AdapterClass = adapterModule.EmailAdapter

			if (!AdapterClass) {
				throw new Error(
					`Package @magnet-cms/adapter-${adapterName} does not export EmailAdapter`,
				)
			}

			// Get the provider-specific config
			const emailConfigAsMap = config as unknown as Record<string, unknown>
			const providerConfig = emailConfigAsMap[adapterName]
			if (!providerConfig) {
				throw new Error(
					`Email adapter '${adapterName}' is configured but no '${adapterName}' config object was provided`,
				)
			}

			const adapter = new AdapterClass(providerConfig) as EmailAdapter
			logger.log(`Email adapter '${adapterName}' loaded successfully`)
			return adapter
		} catch (error) {
			if (
				error instanceof Error &&
				error.message.includes('Cannot find module')
			) {
				throw new Error(
					`Email adapter package @magnet-cms/adapter-${adapterName} is not installed. Run: bun add @magnet-cms/adapter-${adapterName}`,
				)
			}
			throw error
		}
	}
}
