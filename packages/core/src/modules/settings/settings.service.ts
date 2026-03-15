import {
	InjectModel,
	Model,
	PROP_METADATA_KEY,
	PropOptions,
	SchemaSetting,
	type SettingFieldMetadata,
	SettingType,
	SettingValue,
	SettingsDecoratorOptions,
	ValidationException,
	getSettingFields,
	getSettingsOptions,
} from '@magnet-cms/common'
import type { Type } from '@nestjs/common'
import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { MagnetLogger } from '~/modules/logging/logger.service'
import { Setting } from './schemas/setting.schema'

/**
 * Cache entry with expiry timestamp
 */
interface CacheEntry<T> {
	data: T
	expiry: number
}

@Injectable()
export class SettingsService implements OnApplicationBootstrap {
	private registeredSchemas: Map<string, Type> = new Map()
	/** Maps schema class name (lowercase) to actual group name */
	private schemaNameToGroup: Map<string, string> = new Map()
	private modelReady = false

	/** Settings cache with TTL */
	private cache = new Map<string, CacheEntry<unknown>>()
	/** Default cache TTL in milliseconds (1 minute) */
	private readonly CACHE_TTL = 60_000

	constructor(
		@InjectModel(Setting) private readonly settingModel: Model<Setting>,
		private readonly moduleRef: ModuleRef,
		private readonly logger: MagnetLogger,
	) {
		this.logger.setContext(SettingsService.name)
	}

	async onApplicationBootstrap() {
		await this.waitForModel()
	}

	private async waitForModel(): Promise<boolean> {
		if (this.modelReady) return true
		if (!this.settingModel) {
			this.logger.warn('Settings model not available')
			return false
		}
		this.modelReady = true
		return true
	}

	async getSettings(): Promise<Record<string, Setting[]>> {
		const modelReady = await this.waitForModel()
		if (!modelReady) return {}

		try {
			const settings: Setting[] = await this.settingModel.find()
			return settings.reduce(
				(acc: Record<string, Setting[]>, setting: Setting) => {
					acc[setting.group] = acc[setting.group] || []
					acc[setting.group]?.push(setting)
					return acc
				},
				{},
			)
		} catch (error) {
			this.logger.warn('Settings model not ready, returning empty object')
			return {}
		}
	}

	/**
	 * Resolve a group identifier to the actual group name.
	 *
	 * Accepts either:
	 * - Schema class name (lowercase), e.g., "mediasettings" → "media"
	 * - Actual group name, e.g., "media" → "media"
	 */
	resolveGroup(identifier: string): string {
		const lowerIdentifier = identifier.toLowerCase()

		// First check the cached mapping
		const cached = this.schemaNameToGroup.get(lowerIdentifier)
		if (cached) {
			return cached
		}

		// Check if it's already a valid group name in registeredSchemas
		if (this.registeredSchemas.has(identifier)) {
			return identifier
		}

		// Try to find by schema class name in registeredSchemas
		for (const [group, schema] of this.registeredSchemas) {
			if (schema.name.toLowerCase() === lowerIdentifier) {
				// Cache for future lookups
				this.schemaNameToGroup.set(lowerIdentifier, group)
				return group
			}
		}

		// Fallback to using the identifier as-is
		return identifier
	}

	async getSettingsByGroup(group: string): Promise<Setting[]> {
		const modelReady = await this.waitForModel()
		if (!modelReady) return []

		// Resolve the group identifier to actual group name
		const resolvedGroup = this.resolveGroup(group)

		try {
			const settings = await this.settingModel.findMany({
				group: resolvedGroup,
			})
			return settings.map((s) => this.coerceSettingValue(s))
		} catch (error) {
			this.logger.warn(
				`Settings model not ready, returning empty array for group: ${resolvedGroup}`,
			)
			return []
		}
	}

	async getSettingsByGroupAndKey(
		group: string,
		key: string,
	): Promise<Setting | null> {
		const modelReady = await this.waitForModel()
		if (!modelReady) return null

		// Resolve the group identifier to actual group name
		const resolvedGroup = this.resolveGroup(group)

		try {
			const setting = await this.settingModel.findOne({
				group: resolvedGroup,
				key,
			})
			return setting ? this.coerceSettingValue(setting) : null
		} catch (error) {
			this.logger.warn(
				`Settings model not ready, returning null for ${resolvedGroup}/${key}`,
			)
			return null
		}
	}

	/**
	 * Coerce the setting value to its declared type.
	 * SQL adapters store all values as text; this restores the original type.
	 */
	private coerceSettingValue(setting: Setting): Setting {
		if (typeof setting.value !== 'string' || !setting.type) {
			return setting
		}
		switch (setting.type) {
			case 'number': {
				const num = Number(setting.value)
				if (!Number.isNaN(num)) {
					return { ...setting, value: num }
				}
				break
			}
			case 'boolean':
				if (setting.value === 'true' || setting.value === '1') {
					return { ...setting, value: true }
				}
				if (setting.value === 'false' || setting.value === '0') {
					return { ...setting, value: false }
				}
				break
		}
		return setting
	}

	async getSetting(key: string): Promise<Setting | null> {
		const modelReady = await this.waitForModel()
		if (!modelReady) return null

		try {
			return await this.settingModel.findOne({ key })
		} catch (error) {
			this.logger.warn(
				`Settings model not ready, returning null for key: ${key}`,
			)
			return null
		}
	}

	async updateSetting(
		key: string,
		value: SettingValue,
		group?: string,
	): Promise<Setting | null> {
		// Find setting scoped to group when provided, else fall back to key-only
		const resolvedGroup = group ? this.resolveGroup(group) : undefined
		const setting = resolvedGroup
			? await this.getSettingsByGroupAndKey(resolvedGroup, key)
			: await this.getSetting(key)

		if (!setting) {
			throw new Error(`Setting with key "${key}" not found`)
		}

		// Validate the setting value against the registered schema
		const schemaGroup = resolvedGroup ?? this.findGroupByKey(key)[0]
		if (schemaGroup) {
			const schema = this.registeredSchemas.get(schemaGroup)
			if (schema) {
				await this.validateSettingValue(key, value, schema)
			}
		}

		const filter = resolvedGroup
			? ({ key, group: resolvedGroup } as Partial<Setting>)
			: ({ key } as Partial<Setting>)
		return this.settingModel.update(filter, { value })
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

	private async validateSettingValue<T extends object>(
		key: string,
		value: unknown,
		schema: Type<T>,
	): Promise<void> {
		// Create an instance of the schema with only the key we're updating
		const instance = plainToInstance(schema, { [key]: value })
		// Use skipMissingProperties so only the provided key is checked.
		// forbidUnknownValues must be false because @SettingField.* decorators
		// store custom metadata only (no class-validator metadata). Since
		// class-validator 0.14, forbidUnknownValues defaults to true, which
		// rejects classes without class-validator decorators as "unknown values".
		const errors = await validate(instance, {
			skipMissingProperties: true,
			forbidUnknownValues: false,
		})

		if (errors.length > 0) {
			throw new ValidationException(errors)
		}
	}

	async registerSetting(
		group: string,
		key: string,
		type: SettingType | string,
		value: SettingValue,
	): Promise<Setting> {
		const existingSetting: Setting | null = await this.settingModel.findOne({
			group,
			key,
		})
		if (existingSetting) {
			// Only update type if changed, preserve user's value
			if (existingSetting.type !== type) {
				return this.settingModel.update({ group, key }, { type })
			}
			return existingSetting
		}
		// Only create with default value if setting doesn't exist
		return this.settingModel.create({ group, key, type, value })
	}

	async registerSettings(
		group: string,
		settings: SchemaSetting[],
	): Promise<void> {
		for (const setting of settings) {
			// Search by both key AND group to avoid cross-group collisions
			const existingSetting = await this.settingModel.findOne({
				key: setting.key,
				group,
			})

			if (existingSetting) {
				// Only update type if changed, but preserve user's value
				if (existingSetting.type !== setting.type) {
					await this.settingModel.update(
						{ key: setting.key, group } as Partial<Setting>,
						{ type: setting.type } as Partial<Setting>,
					)
				}
			} else {
				// Only create with default value if setting doesn't exist in this group
				await this.settingModel.create({ group, ...setting })
			}
		}
	}

	async registerSettingsFromSchema<T>(
		group: string,
		schema: new () => T,
	): Promise<void> {
		this.registeredSchemas.set(group, schema)
		// Map schema class name (lowercase) to actual group for resolution
		const schemaName = schema.name.toLowerCase()
		this.schemaNameToGroup.set(schemaName, group)
		const instance: T = new schema()

		// Check for new @SettingField.* decorators first
		const settingFieldMetadata: SettingFieldMetadata[] =
			getSettingFields(schema)

		if (settingFieldMetadata.length > 0) {
			// Use new @SettingField.* metadata
			const settingsToRegister: SchemaSetting[] = settingFieldMetadata.map(
				(field) => {
					const key = String(field.propertyKey)
					// Get value from instance (class property default) or from decorator options
					let value = (instance as Record<string, unknown>)[key] as SettingValue
					if (value === undefined && field.options.default !== undefined) {
						value = field.options.default as SettingValue
					}
					// Map setting field type to storage type
					const typeMap: Record<string, string> = {
						text: 'string',
						number: 'number',
						boolean: 'boolean',
						select: 'string',
						secret: 'string',
						image: 'string',
						json: 'object',
						textarea: 'string',
					}
					return {
						key,
						value,
						type: typeMap[field.type] || field.type,
					}
				},
			)
			await this.registerSettings(group, settingsToRegister)
			return
		}

		// Fall back to legacy @Prop decorator metadata
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
				let value = (instance as Record<string, unknown>)[key] as SettingValue
				if (value === undefined) {
					const propData = propMetadataArray.find(
						(p) => p.propertyKey === propertyKey,
					)
					if (propData?.options) {
						value = propData.options.default as SettingValue
					}
				}
				return { key, value, type: type || designType.name }
			},
		)

		await this.registerSettings(group, settingsToRegister)
	}

	/**
	 * Get settings as typed object (legacy method)
	 * @deprecated Use `get<T>(settingsClass)` instead
	 */
	async getTypedSettings<T extends object>(
		group: string,
		schema: Type<T>,
	): Promise<T> {
		const settings = await this.getSettingsByGroup(group)
		const result = new schema()

		for (const setting of settings) {
			const key = setting.key as keyof T
			;(result as Record<keyof T, SettingValue>)[key] = setting.value
		}

		return result
	}

	/**
	 * Get typed settings for a settings class.
	 *
	 * Uses caching with TTL for improved performance.
	 *
	 * @example
	 * ```typescript
	 * const emailConfig = await settings.get(EmailSettings)
	 * console.log(emailConfig.provider) // Type-safe access
	 * ```
	 */
	async get<T extends object>(settingsClass: Type<T>): Promise<T> {
		const options = this.getSettingsOptionsOrThrow(settingsClass)
		const cacheKey = options.group

		// Check cache
		const cached = this.cache.get(cacheKey)
		if (cached && cached.expiry > Date.now()) {
			return cached.data as T
		}

		// Fetch from database
		const settings = await this.getSettingsByGroup(options.group)
		const instance = new settingsClass()

		// Map settings to instance
		for (const setting of settings) {
			const key = setting.key as keyof T
			;(instance as Record<keyof T, SettingValue>)[key] = setting.value
		}

		// Cache the result
		this.cache.set(cacheKey, {
			data: instance,
			expiry: Date.now() + this.CACHE_TTL,
		})

		return instance
	}

	/**
	 * Update settings for a settings class.
	 *
	 * Validates updates against class validators before persisting.
	 *
	 * @example
	 * ```typescript
	 * await settings.update(EmailSettings, { provider: 'sendgrid' })
	 * ```
	 */
	async update<T extends object>(
		settingsClass: Type<T>,
		updates: Partial<T>,
	): Promise<T> {
		const options = this.getSettingsOptionsOrThrow(settingsClass)

		// Validate updates against class validators
		await this.validatePartialUpdates(settingsClass, updates)

		// Update each changed setting
		for (const [key, value] of Object.entries(updates)) {
			const settingKey = key
			const existingSetting = await this.getSettingsByGroupAndKey(
				options.group,
				settingKey,
			)

			if (existingSetting) {
				await this.settingModel.update(
					{ group: options.group, key: settingKey },
					{ value: value as SettingValue },
				)
			} else {
				// Register the setting if it doesn't exist
				await this.settingModel.create({
					group: options.group,
					key: settingKey,
					value: value as SettingValue,
					type: typeof value,
				})
			}
		}

		// Invalidate cache
		this.cache.delete(options.group)

		return this.get(settingsClass)
	}

	/**
	 * Invalidate cache for a settings class.
	 *
	 * Use this when settings are modified externally.
	 */
	invalidate<T extends object>(settingsClass: Type<T>): void {
		const options = getSettingsOptions(settingsClass)
		if (options) {
			this.cache.delete(options.group)
		}
	}

	/**
	 * Invalidate all cached settings
	 */
	invalidateAll(): void {
		this.cache.clear()
	}

	/**
	 * Get settings options or throw if not decorated
	 */
	private getSettingsOptionsOrThrow<T>(
		settingsClass: Type<T>,
	): SettingsDecoratorOptions {
		const options = getSettingsOptions(settingsClass)
		if (!options) {
			throw new Error(
				`${settingsClass.name} is not decorated with @Settings(). Add @Settings({ group: "...", label: "..." }) to the class.`,
			)
		}
		return options
	}

	/**
	 * Validate partial updates against class validators
	 */
	private async validatePartialUpdates<T extends object>(
		settingsClass: Type<T>,
		updates: Partial<T>,
	): Promise<void> {
		// Create an instance with the updates
		const instance = plainToInstance(settingsClass, updates)
		// forbidUnknownValues must be false because @SettingField.* decorators
		// store custom metadata only (no class-validator metadata). Since
		// class-validator 0.14, forbidUnknownValues defaults to true, which
		// rejects classes without class-validator decorators as "unknown values".
		const errors = await validate(instance, {
			skipMissingProperties: true,
			forbidUnknownValues: false,
		})

		if (errors.length > 0) {
			throw new ValidationException(errors)
		}
	}
}
