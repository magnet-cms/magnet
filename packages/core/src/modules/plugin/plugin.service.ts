import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { DiscoveryService, ModulesContainer } from '@nestjs/core'
import { PLUGIN_METADATA } from './constants'
import { PluginHook, PluginMetadata, PluginOptions } from './types'

@Injectable()
export class PluginService implements OnModuleInit {
	private plugins: Map<string, any> = new Map()
	private hooks: Map<string, PluginHook[]> = new Map()

	constructor(
		private readonly discovery: DiscoveryService,
		private readonly modulesContainer: ModulesContainer,
		@Inject('PLUGIN_OPTIONS') private readonly options: PluginOptions,
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
				Reflect.getMetadata(PLUGIN_METADATA, wrapper.metatype),
			)

		// Register each plugin instance
		for (const wrapper of providers) {
			const metadata = Reflect.getMetadata(
				PLUGIN_METADATA,
				wrapper.metatype,
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
			const methodNames = Object.getOwnPropertyNames(prototype).filter(
				(prop) => typeof wrapper.instance[prop] === 'function',
			)

			for (const methodName of methodNames) {
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
			}
		}
	}

	getPlugin(name: string): any {
		return this.plugins.get(name)
	}

	getAllPlugins(): Map<string, any> {
		return this.plugins
	}

	async executeHook(hookName: string, ...args: any[]): Promise<any[]> {
		const hooks = this.hooks.get(hookName) || []
		const results = []

		for (const hook of hooks) {
			try {
				const result = await hook.instance[hook.methodName](...args)
				results.push(result)
			} catch (error) {
				console.error(`Error executing hook ${hookName}:`, error)
			}
		}

		return results
	}
}
