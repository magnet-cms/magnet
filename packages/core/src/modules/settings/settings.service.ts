import {
	InjectModel,
	Model,
	PROP_METADATA_KEY,
	PropOptions,
	SchemaSetting,
	SettingType,
	ValidationException,
} from '@magnet/common'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { Setting } from './schemas/setting.schema'

@Injectable()
export class SettingsService implements OnModuleInit {
	private readonly logger = new Logger(SettingsService.name)
	private registeredSchemas: Map<string, any> = new Map()

	constructor(
		@InjectModel(Setting) private readonly settingModel: Model<Setting>,
	) {}

	async onModuleInit() {
		// Initialize all registered settings schemas
		await this.initializeRegisteredSchemas()
	}

	private async initializeRegisteredSchemas() {
		for (const [group, schema] of this.registeredSchemas.entries()) {
			this.logger.log(`Initializing settings for group: ${group}`)
			await this.registerSettingsFromSchema(group, schema)
		}
	}

	async getSettings(): Promise<Record<string, Setting[]>> {
		const settings: Setting[] = await this.settingModel.find()
		return settings.reduce(
			(acc: Record<string, Setting[]>, setting: Setting) => {
				acc[setting.group] = acc[setting.group] || []
				acc[setting.group]?.push(setting)
				return acc
			},
			{},
		)
	}

	async getSettingsByGroup(group: string): Promise<Setting[]> {
		return await this.settingModel.findMany({ group })
	}

	async getSettingsByGroupAndKey(
		group: string,
		key: string,
	): Promise<Setting | null> {
		return await this.settingModel.findOne({
			group,
			key,
		})
	}

	async getSetting(key: string): Promise<Setting | null> {
		return await this.settingModel.findOne({ key })
	}

	async updateSetting(key: string, value: unknown): Promise<Setting | null> {
		const setting = await this.getSetting(key)
		if (!setting) {
			throw new Error(`Setting with key "${key}" not found`)
		}

		// Validate the setting value against the registered schema
		const [group] = this.findGroupByKey(key)
		if (group) {
			const schema = this.registeredSchemas.get(group)
			if (schema) {
				await this.validateSettingValue(key, value, schema)
			}
		}

		return this.settingModel.update({ key }, { value })
	}

	private findGroupByKey(key: string): [string, Setting] | [] {
		for (const [group, schema] of this.registeredSchemas.entries()) {
			const instance = new schema()
			if (key in instance) {
				return [group, instance]
			}
		}
		return []
	}

	private async validateSettingValue(
		key: string,
		value: unknown,
		schema: any,
	): Promise<void> {
		// Create an instance of the schema with only the key we're updating
		const instance = plainToInstance(schema, { [key]: value })
		// Validate only the specific property
		const errors = await validate(instance as object, {
			skipMissingProperties: true,
			whitelist: true,
			forbidNonWhitelisted: true,
		})

		if (errors.length > 0) {
			throw new ValidationException(errors)
		}
	}

	async registerSetting(
		group: string,
		key: string,
		type: SettingType | string,
		value: unknown,
	): Promise<Setting> {
		const existingSetting: Setting | null = await this.settingModel.findOne({
			group,
			key,
		})
		if (existingSetting) {
			if (
				JSON.stringify(existingSetting.value) === JSON.stringify(value) &&
				existingSetting.type === type
			) {
				return existingSetting
			}
			return this.settingModel.update({ group, key }, { value, type })
		}
		return this.settingModel.create({ group, key, type, value })
	}

	async registerSettings(
		group: string,
		settings: SchemaSetting[],
	): Promise<void> {
		for (const setting of settings) {
			const existingSetting = await this.settingModel.findOne({
				key: setting.key,
			})

			if (existingSetting) {
				if (
					JSON.stringify(existingSetting.value) !==
						JSON.stringify(setting.value) ||
					existingSetting.type !== setting.type ||
					existingSetting.group !== group
				) {
					await this.settingModel.update(
						{ key: setting.key },
						{ value: setting.value, type: setting.type, group },
					)
				}
			} else {
				await this.settingModel.create({ group, ...setting })
			}
		}
	}

	async registerSettingsFromSchema<T>(
		group: string,
		schema: new () => T,
	): Promise<void> {
		this.registeredSchemas.set(group, schema)
		const instance: T = new schema()

		const propMetadataArray: Array<{
			propertyKey: string | symbol
			options: PropOptions
		}> = Reflect.getMetadata(PROP_METADATA_KEY, schema.prototype) || []

		const fields: Array<{
			propertyKey: string | symbol
			designType: Function
			type?: string
		}> = propMetadataArray.map((prop) => {
			const designType: Function = Reflect.getMetadata(
				'design:type',
				schema.prototype,
				prop.propertyKey,
			)
			return {
				propertyKey: prop.propertyKey,
				designType,
				type: designType.name,
			}
		})

		const settingsToRegister: SchemaSetting[] = fields.map(
			({ propertyKey, designType, type }) => {
				const key: string = propertyKey.toString()
				let value: unknown = (instance as Record<string, unknown>)[key]
				if (value === undefined) {
					const propData = propMetadataArray.find(
						(p) => p.propertyKey === propertyKey,
					)
					if (propData?.options) {
						value = propData.options.default
					}
				}
				return { key, value, type: type || designType.name }
			},
		)

		await this.registerSettings(group, settingsToRegister)
	}

	// New method to get settings as typed object
	async getTypedSettings<T>(group: string, schema: new () => T): Promise<T> {
		const settings = await this.getSettingsByGroup(group)
		const result = new schema()

		for (const setting of settings) {
			;(result as any)[setting.key] = setting.value
		}

		return result
	}
}
