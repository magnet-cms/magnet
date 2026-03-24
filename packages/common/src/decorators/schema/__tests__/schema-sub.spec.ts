import 'reflect-metadata'
import { describe, expect, it, vi } from 'vitest'

vi.mock('~/utils/detect-adapter.util', () => ({
	detectDatabaseAdapter: () => 'mongoose',
	setDatabaseAdapter: vi.fn(),
	clearAdapterCache: vi.fn(),
}))

const adapterProp = vi.fn(() => () => {})
const adapterSchema = vi.fn(() => () => {})

vi.mock('~/utils/database-adapter-module.util', () => ({
	requireDatabaseAdapterModule: () => ({
		Prop: adapterProp,
		Schema: adapterSchema,
		InjectModel: () => () => () => {},
	}),
	getDatabaseAdapterResolutionRoots: () => [],
}))

import {
	EXTEND_USER_METADATA_KEY,
	PROP_METADATA_KEY,
	SCHEMA_METADATA_KEY,
	UI_METADATA_KEY,
} from '../../../constants'
import {
	ExtendUser,
	getExtendUserOptions,
	isUserExtension,
} from '../extend-user.decorator'
import { Prop } from '../prop.decorator'
import { UI } from '../ui.decorator'
import { Validators } from '../validators.decorator'
import { VERSION_METADATA_KEY, Version } from '../version.decorator'

describe('UI', () => {
	it('stores options in UI_METADATA_KEY array on target prototype', () => {
		class UIA {
			@UI({ tab: 'content' })
			content!: string
		}
		const fields = Reflect.getMetadata(UI_METADATA_KEY, UIA.prototype)
		expect(fields).toBeDefined()
		expect(fields).toHaveLength(1)
		expect(fields[0]!.propertyKey).toBe('content')
		expect((fields[0]!.options as { tab: string }).tab).toBe('content')
	})

	it('includes designType in stored options (undefined without TS decorator metadata)', () => {
		class UIB {
			@UI({ tab: 'meta' })
			title!: string
		}
		const fields = Reflect.getMetadata(UI_METADATA_KEY, UIB.prototype)
		// designType comes from TypeScript emitDecoratorMetadata;
		// in vitest environment without it, this is undefined
		expect('designType' in fields[0]!.options).toBe(true)
	})

	it('appends multiple UI fields to the array', () => {
		class UIC {
			@UI({ tab: 'main' })
			name!: string

			@UI({ side: true })
			bio!: string
		}
		const fields = Reflect.getMetadata(UI_METADATA_KEY, UIC.prototype)
		expect(fields).toHaveLength(2)
	})

	it('sets design type from reflect metadata when available', () => {
		class UID {
			field!: string
		}
		// Manually set design:type metadata to simulate TypeScript decorator emission
		Reflect.defineMetadata('design:type', String, UID.prototype, 'field')
		UI({ tab: 'main' })(UID.prototype, 'field')
		const fields = Reflect.getMetadata(UI_METADATA_KEY, UID.prototype)
		expect(fields[0]!.options.designType).toBe(String)
	})
})

describe('Prop', () => {
	it('stores { propertyKey, options } array in PROP_METADATA_KEY on target', () => {
		class PropA {
			@Prop({ required: true })
			name!: string
		}
		const props = Reflect.getMetadata(PROP_METADATA_KEY, PropA.prototype)
		expect(props).toBeDefined()
		expect(props).toHaveLength(1)
		expect(props[0]!.propertyKey).toBe('name')
		expect(props[0]!.options.required).toBe(true)
	})

	it('stores multiple props in order', () => {
		class PropB {
			@Prop()
			field1!: string

			@Prop({ unique: true })
			field2!: string
		}
		const props = Reflect.getMetadata(PROP_METADATA_KEY, PropB.prototype)
		expect(props).toHaveLength(2)
	})

	it('delegates to the adapter Prop', () => {
		class PropC {
			@Prop({ required: true })
			title!: string
		}
		expect(adapterProp).toHaveBeenCalledWith({ required: true })
		void PropC
	})

	it('works with no options', () => {
		class PropD {
			@Prop()
			value!: string
		}
		const props = Reflect.getMetadata(PROP_METADATA_KEY, PropD.prototype)
		expect(props[0]!.options).toBeUndefined()
	})
})

describe('Validators', () => {
	it('applies all provided validators to the target', () => {
		const validator1 = vi.fn((_target: object, _key: string | symbol) => {})
		const validator2 = vi.fn((_target: object, _key: string | symbol) => {})

		class ValidatorsA {
			@Validators(
				validator1 as PropertyDecorator,
				validator2 as PropertyDecorator,
			)
			field!: string
		}

		expect(validator1).toHaveBeenCalled()
		expect(validator2).toHaveBeenCalled()
		void ValidatorsA
	})

	it('returns a PropertyDecorator', () => {
		const result = Validators()
		expect(typeof result).toBe('function')
	})
})

describe('Version', () => {
	it('stores empty config by default', () => {
		@Version()
		class VersionA {}
		const config = Reflect.getMetadata(VERSION_METADATA_KEY, VersionA)
		expect(config).toBeDefined()
		expect(config).toEqual({})
	})

	it('stores max version count', () => {
		@Version({ max: 10 })
		class VersionB {}
		const config = Reflect.getMetadata(VERSION_METADATA_KEY, VersionB)
		expect(config.max).toBe(10)
	})

	it('stores drafts configuration', () => {
		@Version({ drafts: true })
		class VersionC {}
		const config = Reflect.getMetadata(VERSION_METADATA_KEY, VersionC)
		expect(config.drafts).toBe(true)
	})

	it('stores drafts object with autoPublish', () => {
		@Version({ drafts: { autoPublish: true, requireApproval: false } })
		class VersionD {}
		const config = Reflect.getMetadata(VERSION_METADATA_KEY, VersionD)
		expect(config.drafts.autoPublish).toBe(true)
		expect(config.drafts.requireApproval).toBe(false)
	})

	it('stores metadata on the class constructor', () => {
		@Version({ max: 5 })
		class VersionE {}
		const config = Reflect.getMetadata(VERSION_METADATA_KEY, VersionE)
		expect(config).toBeDefined()
	})
})

describe('ExtendUser', () => {
	it('sets EXTEND_USER_METADATA_KEY on the class', () => {
		@ExtendUser()
		class ExtUserA {}
		expect(Reflect.hasMetadata(EXTEND_USER_METADATA_KEY, ExtUserA)).toBe(true)
	})

	it('also sets SCHEMA_METADATA_KEY on the class', () => {
		@ExtendUser()
		class ExtUserB {}
		expect(Reflect.getMetadata(SCHEMA_METADATA_KEY, ExtUserB)).toBe(true)
	})

	it('defaults timestamps to true', () => {
		@ExtendUser()
		class ExtUserC {}
		const opts = Reflect.getMetadata(EXTEND_USER_METADATA_KEY, ExtUserC)
		expect(opts.timestamps).toBe(true)
	})

	it('allows setting timestamps to false', () => {
		@ExtendUser({ timestamps: false })
		class ExtUserD {}
		const opts = Reflect.getMetadata(EXTEND_USER_METADATA_KEY, ExtUserD)
		expect(opts.timestamps).toBe(false)
	})
})

describe('isUserExtension', () => {
	it('returns false for plain classes', () => {
		class PlainClass {}
		expect(isUserExtension(PlainClass)).toBe(false)
	})

	it('returns true for classes decorated with @ExtendUser', () => {
		@ExtendUser()
		class ExtUserE {}
		expect(isUserExtension(ExtUserE)).toBe(true)
	})
})

describe('getExtendUserOptions', () => {
	it('returns undefined for undecorated classes', () => {
		class PlainF {}
		expect(getExtendUserOptions(PlainF)).toBeUndefined()
	})

	it('returns stored options for decorated classes', () => {
		@ExtendUser({ timestamps: false })
		class ExtUserG {}
		const opts = getExtendUserOptions(ExtUserG)
		expect(opts).toBeDefined()
		expect(opts!.timestamps).toBe(false)
	})
})
