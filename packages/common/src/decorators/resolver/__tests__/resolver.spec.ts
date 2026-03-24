import 'reflect-metadata'
import { describe, expect, it } from 'vitest'

import { RESOLVER_METADATA_KEY, RESOLVE_METADATA_KEY } from '../../../constants'
import { Resolve } from '../resolve.decorator'
import { Resolver } from '../resolver.decorator'

// Stub types for testing
class SchemaA {}
class SchemaB {}
class SchemaC {}

describe('Resolve', () => {
	it('stores { type, isArray: false } when given a function', () => {
		class ResolveFnA {
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(
			ResolveFnA.prototype,
			'method',
		)!
		Resolve(() => SchemaA)(ResolveFnA.prototype, 'method', descriptor)
		const metadata = Reflect.getMetadata(RESOLVE_METADATA_KEY, descriptor.value)
		expect(metadata).toBeDefined()
		expect(metadata.type).toBe(SchemaA)
		expect(metadata.isArray).toBe(false)
	})

	it('stores { type: [...], isArray: true } when given an array of functions', () => {
		class ResolveFnB {
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(
			ResolveFnB.prototype,
			'method',
		)!
		Resolve([() => SchemaA, () => SchemaB])(
			ResolveFnB.prototype,
			'method',
			descriptor,
		)
		const metadata = Reflect.getMetadata(RESOLVE_METADATA_KEY, descriptor.value)
		expect(metadata.isArray).toBe(true)
		expect(metadata.type).toEqual([SchemaA, SchemaB])
	})

	it('stores options with computed isArray when given an object with single type', () => {
		class ResolveFnC {
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(
			ResolveFnC.prototype,
			'method',
		)!
		Resolve({ type: SchemaA })(ResolveFnC.prototype, 'method', descriptor)
		const metadata = Reflect.getMetadata(RESOLVE_METADATA_KEY, descriptor.value)
		expect(metadata.type).toBe(SchemaA)
		expect(metadata.isArray).toBe(false)
	})

	it('computes isArray: true when given an object with array type', () => {
		class ResolveFnD {
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(
			ResolveFnD.prototype,
			'method',
		)!
		Resolve({ type: [SchemaA, SchemaB] })(
			ResolveFnD.prototype,
			'method',
			descriptor,
		)
		const metadata = Reflect.getMetadata(RESOLVE_METADATA_KEY, descriptor.value)
		expect(metadata.isArray).toBe(true)
	})

	it('stores description from object input', () => {
		class ResolveFnE {
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(
			ResolveFnE.prototype,
			'method',
		)!
		Resolve({ type: SchemaA, description: 'Returns schema A' })(
			ResolveFnE.prototype,
			'method',
			descriptor,
		)
		const metadata = Reflect.getMetadata(RESOLVE_METADATA_KEY, descriptor.value)
		expect(metadata.description).toBe('Returns schema A')
	})

	it('throws when object input is missing type', () => {
		class ResolveFnF {
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(
			ResolveFnF.prototype,
			'method',
		)!
		expect(() =>
			Resolve({} as { type: typeof SchemaA })(
				ResolveFnF.prototype,
				'method',
				descriptor,
			),
		).toThrow("@Resolve object input must include a 'type' property.")
	})

	it('throws when array input contains non-functions', () => {
		class ResolveFnG {
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(
			ResolveFnG.prototype,
			'method',
		)!
		// Pass a string (non-function) in the array to trigger the guard
		expect(() =>
			Resolve(['not-a-function' as unknown as () => typeof SchemaC])(
				ResolveFnG.prototype,
				'method',
				descriptor,
			),
		).toThrow('@Resolve array input must only contain functions.')
	})

	it('throws when descriptor has no value', () => {
		class ResolveFnH {
			method() {}
		}
		const emptyDescriptor = {
			value: undefined,
			writable: true,
			enumerable: false,
			configurable: true,
		}
		expect(() =>
			Resolve(() => SchemaA)(
				ResolveFnH.prototype,
				'method',
				emptyDescriptor as PropertyDescriptor,
			),
		).toThrow('@Resolve must be used within a method.')
	})

	it('works via class decorator syntax', () => {
		class ResolveFnI {
			@Resolve(() => SchemaA)
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(
			ResolveFnI.prototype,
			'method',
		)!
		const metadata = Reflect.getMetadata(RESOLVE_METADATA_KEY, descriptor.value)
		expect(metadata.type).toBe(SchemaA)
	})
})

describe('Resolver', () => {
	it('stores { schema } when given a function', () => {
		@Resolver(() => SchemaA)
		class ResolverFnA {}
		const metadata = Reflect.getMetadata(RESOLVER_METADATA_KEY, ResolverFnA)
		expect(metadata).toBeDefined()
		expect(metadata.schema).toBe(SchemaA)
	})

	it('stores options when given an object with schema', () => {
		@Resolver({ schema: SchemaB })
		class ResolverFnB {}
		const metadata = Reflect.getMetadata(RESOLVER_METADATA_KEY, ResolverFnB)
		expect(metadata.schema).toBe(SchemaB)
	})

	it('throws when object input is missing schema', () => {
		expect(() => {
			@Resolver({} as { schema: typeof SchemaC })
			class ResolverFnC {}
			return ResolverFnC
		}).toThrow("@Resolver object input must include a 'schema' property.")
	})

	it('stores metadata on the class constructor', () => {
		@Resolver(() => SchemaC)
		class ResolverFnD {}
		const metadata = Reflect.getMetadata(RESOLVER_METADATA_KEY, ResolverFnD)
		expect(metadata).toBeDefined()
	})
})
