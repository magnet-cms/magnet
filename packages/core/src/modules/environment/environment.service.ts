import { MagnetModuleOptions } from '@magnet-cms/common'
import { Inject, Injectable } from '@nestjs/common'
import mongoose from 'mongoose'
import { SettingsService } from '~/modules/settings/settings.service'
import { EnvironmentItem } from './setting/environment.setting'

@Injectable()
export class EnvironmentService {
	constructor(
		@Inject(MagnetModuleOptions)
		private readonly options: MagnetModuleOptions,
		private readonly settingsService: SettingsService,
	) {}

	private getConnectionString(): string {
		const db = this.options.db
		// Mongoose config
		if ('uri' in db) {
			return db.uri
		}
		// Drizzle config
		if ('connectionString' in db) {
			return db.connectionString
		}
		// TypeORM configs - construct a connection string representation
		if ('type' in db && 'host' in db) {
			return `${db.type}://${db.host}:${db.port}/${db.database}`
		}
		return 'unknown'
	}

	/**
	 * Get the local environment from server configuration
	 * This is always present and connection string cannot be changed
	 */
	getLocalEnvironment(): EnvironmentItem {
		return {
			id: 'local',
			name: 'Local',
			connectionString: this.getConnectionString(),
			description: 'Local environment from application configuration',
			isDefault: true,
			isLocal: true,
		}
	}

	async findAll(): Promise<EnvironmentItem[]> {
		// Get local environment from module options (always first, read-only)
		const localEnv = this.getLocalEnvironment()

		// Get custom environments from settings
		const settings =
			await this.settingsService.getSettingsByGroup('environments')
		const environmentsSetting = settings.find((s) => s.key === 'environments')

		// Parse value - may be a JSON string or already parsed array
		let customEnvs: EnvironmentItem[] = []
		if (environmentsSetting?.value) {
			const val = environmentsSetting.value
			let parsed: unknown
			if (typeof val === 'string') {
				try {
					parsed = JSON.parse(val)
				} catch {
					parsed = null
				}
			} else if (Array.isArray(val)) {
				parsed = val
			} else {
				parsed = null
			}

			// Filter to only include valid EnvironmentItem objects
			// (must be objects with required fields like id, name, connectionString)
			if (Array.isArray(parsed)) {
				customEnvs = parsed.filter(
					(item): item is EnvironmentItem =>
						typeof item === 'object' &&
						item !== null &&
						'id' in item &&
						'name' in item &&
						'connectionString' in item &&
						typeof item.id === 'string' &&
						typeof item.name === 'string' &&
						typeof item.connectionString === 'string',
				)
			}
		}

		// Check if any custom env is default
		const hasDefault = customEnvs.some((env) => env.isDefault)
		if (hasDefault) {
			localEnv.isDefault = false
		}

		return [localEnv, ...customEnvs]
	}

	async testConnection(connectionString: string): Promise<boolean> {
		try {
			const connection = await mongoose.createConnection(connectionString, {
				serverSelectionTimeoutMS: 5000,
			})
			await connection.close()
			return true
		} catch {
			return false
		}
	}
}
