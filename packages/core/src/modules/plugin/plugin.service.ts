import type { Type } from '@nestjs/common'
import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common'
import { DiscoveryService, ModulesContainer } from '@nestjs/core'
import { PLUGIN_METADATA } from './constants'
import type { PluginHook, PluginMetadata } from './types'

/**
 * @deprecated Use PluginModuleOptions instead
 */
interface PluginOptions {
	plugins: Type[]
}

@Injectable()
export class PluginService implements OnModuleInit {
	private plugins: Map<string, unknown> = new Map()
	private hooks: Map<string, PluginHook[]> = new Map()

	constructor(
		private readonly discovery: DiscoveryService,
		private readonly modulesContainer: ModulesContainer,
		@Optional()
		@Inject('PLUGIN_OPTIONS')
		private readonly options: PluginOptions = { plugins: [] },
	) {}

	onModuleInit() {
		this.discoverPlugins()
		this.discoverHooks()
	}

	private discoverPlugins() {
		// Find all providers with the PLUGIN_METADATA
		const providers = [...this.modulesContainer.values()]
			.flatMap((module) => [...module.providers.values()])
			.filter(
				(wrapper) => wrapper.metatype && typeof wrapper.metatype === 'function',
			)
			.filter((wrapper) =>
				Reflect.getMetadata(PLUGIN_METADATA, wrapper.metatype as object),
			)

		// Register each plugin instance
		for (const wrapper of providers) {
			// metatype is guaranteed to be defined by the filter above
			const metatype = wrapper.metatype as object
			const metadata = Reflect.getMetadata(
				PLUGIN_METADATA,
				metatype,
			) as PluginMetadata
			if (metadata && wrapper.instance) {
				this.plugins.set(metadata.name, wrapper.instance)
			}
		}
	}

	private discoverHooks() {
		// Process all providers to find hook methods
		const providers = this.discovery.getProviders()

		for (const wrapper of providers) {
			if (!wrapper.instance) continue

			const prototype = Object.getPrototypeOf(wrapper.instance)
			if (!prototype) continue

			const methodNames = Object.getOwnPropertyNames(prototype).filter(
				(prop) => {
					try {
						// Some strict mode functions may restrict access to certain properties
						return (
							typeof prototype[prop] === 'function' && prop !== 'constructor'
						)
					} catch {
						return false
					}
				},
			)

			for (const methodName of methodNames) {
				try {
					const method = prototype[methodName]
					const hookMetadata = Reflect.getMetadata('hook', method)

					if (hookMetadata) {
						const { hookName } = hookMetadata
						if (!this.hooks.has(hookName)) {
							this.hooks.set(hookName, [])
						}
						this.hooks.get(hookName)?.push({
							instance: wrapper.instance,
							methodName,
						})
					}
				} catch {
					// Skip methods that cannot be accessed due to strict mode restrictions
				}
			}
		}
	}

	getPlugin(name: string): unknown {
		return this.plugins.get(name)
	}

	getAllPlugins(): Map<string, unknown> {
		return this.plugins
	}

	async executeHook(hookName: string, ...args: unknown[]): Promise<unknown[]> {
		const hooks = this.hooks.get(hookName) || []
		const results = []

		for (const hook of hooks) {
			try {
				const instance = hook.instance as Record<string | symbol, Function>
				const method = instance[hook.methodName]
				if (typeof method === 'function') {
					const result = await method.call(instance, ...args)
					results.push(result)
				}
			} catch (error) {
				console.error(`Error executing hook ${hookName}:`, error)
			}
		}

		return results
	}
}
