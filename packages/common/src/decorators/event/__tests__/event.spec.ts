import 'reflect-metadata'
import { describe, expect, it } from 'vitest'

import { EVENT_HANDLER_METADATA, OnEvent } from '../event.decorator'

describe('OnEvent', () => {
	it('stores event name and empty options by default', () => {
		class EvA {
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(EvA.prototype, 'method')!
		OnEvent('content.created')(EvA.prototype, 'method', descriptor)
		const metadata = Reflect.getMetadata(
			EVENT_HANDLER_METADATA,
			descriptor.value,
		)
		expect(metadata).toBeDefined()
		expect(metadata.event).toBe('content.created')
		expect(metadata.options).toEqual({})
	})

	it('stores custom priority option', () => {
		class EvB {
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(EvB.prototype, 'method')!
		OnEvent('content.updated', { priority: 10 })(
			EvB.prototype,
			'method',
			descriptor,
		)
		const metadata = Reflect.getMetadata(
			EVENT_HANDLER_METADATA,
			descriptor.value,
		)
		expect(metadata.options.priority).toBe(10)
	})

	it('stores async option', () => {
		class EvC {
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(EvC.prototype, 'method')!
		OnEvent('user.login', { async: true })(EvC.prototype, 'method', descriptor)
		const metadata = Reflect.getMetadata(
			EVENT_HANDLER_METADATA,
			descriptor.value,
		)
		expect(metadata.options.async).toBe(true)
		expect(metadata.event).toBe('user.login')
	})

	it('stores combined options (priority + async)', () => {
		class EvD {
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(EvD.prototype, 'method')!
		OnEvent('content.deleted', { priority: 50, async: true })(
			EvD.prototype,
			'method',
			descriptor,
		)
		const metadata = Reflect.getMetadata(
			EVENT_HANDLER_METADATA,
			descriptor.value,
		)
		expect(metadata.event).toBe('content.deleted')
		expect(metadata.options.priority).toBe(50)
		expect(metadata.options.async).toBe(true)
	})

	it('stores metadata via class decorator syntax', () => {
		class EvE {
			@OnEvent('content.published', { priority: 1 })
			handler() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(
			EvE.prototype,
			'handler',
		)!
		const metadata = Reflect.getMetadata(
			EVENT_HANDLER_METADATA,
			descriptor.value,
		)
		expect(metadata.event).toBe('content.published')
		expect(metadata.options.priority).toBe(1)
	})

	it('returns the original descriptor', () => {
		class EvF {
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(EvF.prototype, 'method')!
		const result = OnEvent('content.created')(
			EvF.prototype,
			'method',
			descriptor,
		)
		expect(result).toBe(descriptor)
	})
})
