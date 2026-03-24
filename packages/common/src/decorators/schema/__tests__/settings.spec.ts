import 'reflect-metadata'
import { describe, expect, it } from 'vitest'

import {
	SETTINGS_OPTIONS_METADATA_KEY,
	SETTING_FIELD_METADATA_KEY,
	SETTING_METADATA_KEY,
} from '../../../constants'
import {
	SettingField,
	Settings,
	getSettingFields,
	getSettingsOptions,
} from '../settings.decorator'

describe('Settings', () => {
	it('marks class with SETTING_METADATA_KEY = true', () => {
		@Settings({ group: 'general', label: 'General Settings' })
		class SettA {}
		expect(Reflect.getMetadata(SETTING_METADATA_KEY, SettA)).toBe(true)
	})

	it('stores group and label options', () => {
		@Settings({ group: 'email', label: 'Email Settings' })
		class SettB {}
		const opts = Reflect.getMetadata(SETTINGS_OPTIONS_METADATA_KEY, SettB)
		expect(opts.group).toBe('email')
		expect(opts.label).toBe('Email Settings')
	})

	it('stores optional icon option', () => {
		@Settings({ group: 'storage', label: 'Storage', icon: 'cloud' })
		class SettC {}
		const opts = Reflect.getMetadata(SETTINGS_OPTIONS_METADATA_KEY, SettC)
		expect(opts.icon).toBe('cloud')
	})
})

describe('getSettingsOptions', () => {
	it('returns stored options for decorated class', () => {
		@Settings({ group: 'auth', label: 'Auth Settings' })
		class GetSettD {}
		const opts = getSettingsOptions(GetSettD)
		expect(opts).toBeDefined()
		expect(opts!.group).toBe('auth')
	})

	it('returns undefined for undecorated class', () => {
		class GetSettE {}
		expect(getSettingsOptions(GetSettE)).toBeUndefined()
	})
})

describe('SettingField.Text', () => {
	it('stores type "text" with label', () => {
		class FieldTextA {
			@SettingField.Text({ label: 'Site Name' })
			siteName!: string
		}
		const fields = getSettingFields(FieldTextA)
		expect(fields).toHaveLength(1)
		expect(fields[0]!.type).toBe('text')
		expect(fields[0]!.propertyKey).toBe('siteName')
	})
})

describe('SettingField.Number', () => {
	it('stores type "number"', () => {
		class FieldNumA {
			@SettingField.Number({ label: 'Max Items' })
			maxItems!: number
		}
		const fields = getSettingFields(FieldNumA)
		expect(fields[0]!.type).toBe('number')
	})
})

describe('SettingField.Boolean', () => {
	it('stores type "boolean"', () => {
		class FieldBoolA {
			@SettingField.Boolean({ label: 'Maintenance Mode' })
			maintenanceMode!: boolean
		}
		const fields = getSettingFields(FieldBoolA)
		expect(fields[0]!.type).toBe('boolean')
	})
})

describe('SettingField.Select', () => {
	it('stores type "select"', () => {
		class FieldSelA {
			@SettingField.Select({
				label: 'Provider',
				options: ['a', 'b'],
			} as Parameters<typeof SettingField.Select>[0])
			provider!: string
		}
		const fields = getSettingFields(FieldSelA)
		expect(fields[0]!.type).toBe('select')
	})
})

describe('SettingField.Secret', () => {
	it('stores type "secret" with masked: true by default', () => {
		class FieldSecretA {
			@SettingField.Secret({ label: 'API Key' })
			apiKey!: string
		}
		const fields = getSettingFields(FieldSecretA)
		expect(fields[0]!.type).toBe('secret')
		expect((fields[0]!.options as { masked?: boolean }).masked).toBe(true)
	})

	it('allows overriding masked option', () => {
		class FieldSecretB {
			@SettingField.Secret({ label: 'Token', masked: false })
			token!: string
		}
		const fields = getSettingFields(FieldSecretB)
		expect((fields[0]!.options as { masked?: boolean }).masked).toBe(false)
	})
})

describe('SettingField.Image', () => {
	it('stores type "image"', () => {
		class FieldImgA {
			@SettingField.Image({ label: 'Logo' })
			logo!: string
		}
		const fields = getSettingFields(FieldImgA)
		expect(fields[0]!.type).toBe('image')
	})
})

describe('SettingField.JSON', () => {
	it('stores type "json"', () => {
		class FieldJsonA {
			@SettingField.JSON({ label: 'Config' })
			config!: object
		}
		const fields = getSettingFields(FieldJsonA)
		expect(fields[0]!.type).toBe('json')
	})
})

describe('SettingField.Textarea', () => {
	it('stores type "textarea"', () => {
		class FieldTextareaA {
			@SettingField.Textarea({ label: 'Description' })
			description!: string
		}
		const fields = getSettingFields(FieldTextareaA)
		expect(fields[0]!.type).toBe('textarea')
	})
})

describe('getSettingFields', () => {
	it('returns empty array for class with no fields', () => {
		class NoFieldsA {}
		expect(getSettingFields(NoFieldsA)).toEqual([])
	})

	it('returns all fields for a class with multiple fields', () => {
		class MultiFieldA {
			@SettingField.Text({ label: 'Name' })
			name!: string

			@SettingField.Boolean({ label: 'Active' })
			active!: boolean

			@SettingField.Number({ label: 'Count' })
			count!: number
		}
		const fields = getSettingFields(MultiFieldA)
		expect(fields).toHaveLength(3)
		const types = fields.map((f) => f.type)
		expect(types).toContain('text')
		expect(types).toContain('boolean')
		expect(types).toContain('number')
	})

	it('deduplicates by propertyKey — re-decorating replaces existing entry', () => {
		// Simulate re-decoration by applying the decorator manually twice on same property
		const dec1 = SettingField.Text({ label: 'First' })
		const dec2 = SettingField.Text({ label: 'Second' })

		class DedupA {}
		// First decoration
		dec1(DedupA.prototype, 'field')
		expect(
			Reflect.getMetadata(SETTING_FIELD_METADATA_KEY, DedupA),
		).toHaveLength(1)

		// Second decoration on same property — should replace
		dec2(DedupA.prototype, 'field')
		const fields = getSettingFields(DedupA)
		expect(fields).toHaveLength(1)
		expect((fields[0]!.options as { label: string }).label).toBe('Second')
	})

	it('preserves propertyKey in field metadata', () => {
		class PropKeyA {
			@SettingField.Text({ label: 'Title' })
			pageTitle!: string
		}
		const fields = getSettingFields(PropKeyA)
		expect(fields[0]!.propertyKey).toBe('pageTitle')
	})
})
