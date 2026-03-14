import type { SettingValue, SettingsRecord } from '@magnet-cms/common'
import { ValidationException } from '@magnet-cms/common'
import {
	Body,
	Controller,
	Get,
	HttpException,
	HttpStatus,
	Param,
	Put,
} from '@nestjs/common'
import { SettingsService } from './settings.service'

@Controller('settings')
export class SettingsController {
	constructor(private readonly settingsService: SettingsService) {}

	@Get()
	async getAllSettings() {
		return this.settingsService.getSettings()
	}

	/**
	 * Get all settings for a group as an array
	 */
	@Get(':group')
	async getSettings(@Param('group') group: string) {
		return this.settingsService.getSettingsByGroup(group)
	}

	@Get(':group/:key')
	async getSetting(@Param('group') group: string, @Param('key') key: string) {
		const setting = await this.settingsService.getSettingsByGroupAndKey(
			group,
			key,
		)
		if (!setting) {
			throw new HttpException(
				`Setting with key "${key}" in group "${group}" not found`,
				HttpStatus.NOT_FOUND,
			)
		}
		return setting
	}

	@Put(':group')
	async updateSettingsByGroup(
		@Param('group') _group: string,
		@Body() data: SettingsRecord,
	) {
		try {
			const results: SettingsRecord = {}

			// Update each setting in the group
			for (const [key, value] of Object.entries(data) as [
				string,
				SettingValue,
			][]) {
				const updated = await this.settingsService.updateSetting(key, value)
				if (updated) {
					results[key] = updated.value
				}
			}

			return results
		} catch (error: unknown) {
			if (error instanceof ValidationException) throw error
			throw new HttpException(
				error instanceof Error ? error.message : 'Failed to update settings',
				HttpStatus.BAD_REQUEST,
			)
		}
	}

	@Put(':group/:key')
	async updateSetting(
		@Param('group') _group: string,
		@Param('key') key: string,
		@Body('value') value: SettingValue,
	) {
		try {
			return await this.settingsService.updateSetting(key, value)
		} catch (error: unknown) {
			if (error instanceof ValidationException) throw error
			throw new HttpException(
				error instanceof Error ? error.message : 'Failed to update setting',
				HttpStatus.BAD_REQUEST,
			)
		}
	}
}
