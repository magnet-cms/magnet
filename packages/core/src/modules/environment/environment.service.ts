import { MagnetModuleOptions } from '@magnet/common'
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
		if ('uri' in db) {
			return db.uri
		}
		// For TypeORM configs, construct a connection string representation
		return `${db.type}://${db.host}:${db.port}/${db.database}`
	}

	async findAll(): Promise<EnvironmentItem[]> {
		// Get local environment from module options (always first, read-only)
		const localEnv: EnvironmentItem = {
			id: 'local',
			name: 'Local',
			connectionString: this.getConnectionString(),
			description: 'Local environment from application configuration',
			isDefault: false,
			isLocal: true,
		}

		// Get custom environments from settings
		const settings = await this.settingsService.getSettingsByGroup(
			'environmentsettings',
		)
		const environmentsSetting = settings.find((s) => s.key === 'environments')
		const customEnvs: EnvironmentItem[] =
			(environmentsSetting?.value as EnvironmentItem[]) || []

		// Check if local should be default
		const hasDefault = customEnvs.some((env) => env.isDefault)
		if (!hasDefault) {
			localEnv.isDefault = true
		}

		return [localEnv, ...customEnvs]
	}

	async getActiveEnvironment(): Promise<string> {
		const settings = await this.settingsService.getSettingsByGroup(
			'environmentsettings',
		)
		const activeSetting = settings.find((s) => s.key === 'activeEnvironment')
		return (activeSetting?.value as string) || 'local'
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
