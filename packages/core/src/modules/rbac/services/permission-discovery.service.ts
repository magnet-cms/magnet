import {
	type CategorizedPermissions,
	PERMISSION_METADATA_KEY,
	type PermissionDefinition,
	type PermissionGroup,
	type PermissionOptions,
} from '@magnet-cms/common'
import { Injectable, OnModuleInit } from '@nestjs/common'
import { ModulesContainer } from '@nestjs/core'
import type { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper'
import { DiscoveryService } from '../../discovery/discovery.service'
import { PluginRegistryService } from '../../plugin/plugin-registry.service'
import { CRUD_ACTIONS } from '../rbac.constants'

/**
 * Service for discovering all permissions in the system.
 *
 * Permissions are discovered from:
 * 1. Schema definitions - auto-generated CRUD permissions
 * 2. Controller methods - @RequirePermission decorated methods
 * 3. Plugins - permissions defined in plugin manifests
 */
@Injectable()
export class PermissionDiscoveryService implements OnModuleInit {
	private permissions: Map<string, PermissionDefinition> = new Map()
	private initialized = false

	constructor(
		private readonly discoveryService: DiscoveryService,
		private readonly modulesContainer: ModulesContainer,
		private readonly pluginRegistry: PluginRegistryService,
	) {}

	async onModuleInit(): Promise<void> {
		await this.discoverPermissions()
	}

	/**
	 * Discover all permissions from schemas, controllers, and plugins
	 */
	private async discoverPermissions(): Promise<void> {
		if (this.initialized) return

		this.discoverSchemaPermissions()
		this.discoverControllerPermissions()
		this.discoverPluginPermissions()
		this.discoverSystemPermissions()

		this.initialized = true
	}

	/**
	 * Auto-generate CRUD permissions for each discovered schema
	 */
	private discoverSchemaPermissions(): void {
		const schemas = this.discoveryService.getAllDiscoveredSchemas()

		for (const schema of schemas) {
			const apiName = schema.apiName ?? schema.name.toLowerCase()
			const displayName = schema.displayName ?? schema.name

			for (const action of CRUD_ACTIONS) {
				const permissionId = `content.${apiName}.${action}`
				const actionLabel = this.getActionLabel(action)

				this.permissions.set(permissionId, {
					id: permissionId,
					name: actionLabel,
					description: `${actionLabel} ${displayName} entries`,
					group: 'Collection Types',
					schema: schema.name,
					apiId: `api::${apiName}`,
					source: 'schema',
				})
			}
		}
	}

	/**
	 * Discover @RequirePermission decorated methods from controllers
	 */
	private discoverControllerPermissions(): void {
		for (const module of this.modulesContainer.values()) {
			for (const wrapper of module.controllers.values()) {
				this.extractControllerPermissions(wrapper)
			}
		}
	}

	/**
	 * Extract permissions from a controller's methods
	 */
	private extractControllerPermissions(wrapper: InstanceWrapper): void {
		const instance = wrapper.instance
		if (!instance) return

		const prototype = Object.getPrototypeOf(instance) as object

		for (const methodName of Object.getOwnPropertyNames(prototype)) {
			if (methodName === 'constructor') continue

			const method = prototype[methodName as keyof typeof prototype]
			if (typeof method !== 'function') continue

			const permOptions = Reflect.getMetadata(
				PERMISSION_METADATA_KEY,
				method,
			) as PermissionOptions | undefined

			if (!permOptions) continue

			// Skip dynamic permissions (with placeholders like {schema})
			// These are resolved at runtime
			if (permOptions.id.includes('{')) continue

			this.permissions.set(permOptions.id, {
				id: permOptions.id,
				name: permOptions.name,
				description: permOptions.description ?? `Requires ${permOptions.id}`,
				group: permOptions.group ?? 'Controllers',
				source: 'controller',
				controller: wrapper.name,
				method: methodName,
			})
		}
	}

	/**
	 * Discover permissions from registered plugins
	 */
	private discoverPluginPermissions(): void {
		const plugins = this.pluginRegistry.getAllPlugins()

		for (const plugin of plugins) {
			const manifest = plugin.frontendManifest
			if (!manifest?.permissions) continue

			for (const permId of manifest.permissions) {
				const permissionId = permId.startsWith('plugin.')
					? permId
					: `plugin.${plugin.metadata.name}.${permId}`

				this.permissions.set(permissionId, {
					id: permissionId,
					name: this.formatPermissionName(permId),
					description: `Plugin permission for ${plugin.metadata.name}`,
					group: 'Plugins',
					plugin: plugin.metadata.name,
					apiId: `plugin::${plugin.metadata.name}`,
					source: 'plugin',
				})
			}
		}
	}

	/**
	 * Add system-level permissions
	 */
	private discoverSystemPermissions(): void {
		const systemPermissions: PermissionDefinition[] = [
			// User management
			{
				id: 'users.find',
				name: 'List Users',
				description: 'View list of users',
				group: 'Users',
				apiId: 'system::users',
				source: 'manual',
			},
			{
				id: 'users.findOne',
				name: 'View User',
				description: 'View user details',
				group: 'Users',
				apiId: 'system::users',
				source: 'manual',
			},
			{
				id: 'users.create',
				name: 'Create User',
				description: 'Create new users',
				group: 'Users',
				apiId: 'system::users',
				source: 'manual',
			},
			{
				id: 'users.update',
				name: 'Update User',
				description: 'Update user details',
				group: 'Users',
				apiId: 'system::users',
				source: 'manual',
			},
			{
				id: 'users.delete',
				name: 'Delete User',
				description: 'Delete users',
				group: 'Users',
				apiId: 'system::users',
				source: 'manual',
			},
			// Role management
			{
				id: 'roles.find',
				name: 'List Roles',
				description: 'View list of roles',
				group: 'Access Control',
				apiId: 'system::roles',
				source: 'manual',
			},
			{
				id: 'roles.findOne',
				name: 'View Role',
				description: 'View role details',
				group: 'Access Control',
				apiId: 'system::roles',
				source: 'manual',
			},
			{
				id: 'roles.create',
				name: 'Create Role',
				description: 'Create new roles',
				group: 'Access Control',
				apiId: 'system::roles',
				source: 'manual',
			},
			{
				id: 'roles.update',
				name: 'Update Role',
				description: 'Update role details and permissions',
				group: 'Access Control',
				apiId: 'system::roles',
				source: 'manual',
			},
			{
				id: 'roles.delete',
				name: 'Delete Role',
				description: 'Delete non-system roles',
				group: 'Access Control',
				apiId: 'system::roles',
				source: 'manual',
			},
			// Settings
			{
				id: 'settings.read',
				name: 'Read Settings',
				description: 'View system settings',
				group: 'Settings',
				apiId: 'system::settings',
				source: 'manual',
			},
			{
				id: 'settings.write',
				name: 'Write Settings',
				description: 'Modify system settings',
				group: 'Settings',
				apiId: 'system::settings',
				source: 'manual',
			},
			// Media
			{
				id: 'media.upload',
				name: 'Upload Media',
				description: 'Upload media files',
				group: 'Media',
				apiId: 'system::media',
				source: 'manual',
			},
			{
				id: 'media.delete',
				name: 'Delete Media',
				description: 'Delete media files',
				group: 'Media',
				apiId: 'system::media',
				source: 'manual',
			},
			{
				id: 'media.find',
				name: 'Browse Media',
				description: 'Browse media library',
				group: 'Media',
				apiId: 'system::media',
				source: 'manual',
			},
		]

		for (const perm of systemPermissions) {
			this.permissions.set(perm.id, perm)
		}
	}

	/**
	 * Get all discovered permissions
	 */
	getAll(): PermissionDefinition[] {
		return Array.from(this.permissions.values())
	}

	/**
	 * Get a specific permission by ID
	 */
	get(id: string): PermissionDefinition | undefined {
		return this.permissions.get(id)
	}

	/**
	 * Check if a permission exists
	 */
	has(id: string): boolean {
		return this.permissions.has(id)
	}

	/**
	 * Get permissions grouped for UI display
	 */
	getGrouped(): PermissionGroup[] {
		const groups = new Map<string, PermissionGroup>()

		for (const perm of this.permissions.values()) {
			const groupKey = perm.apiId ?? perm.group ?? 'Other'

			if (!groups.has(groupKey)) {
				groups.set(groupKey, {
					id: groupKey,
					name: perm.schema ?? perm.plugin ?? perm.group ?? 'Other',
					apiId: perm.apiId,
					permissions: [],
				})
			}

			const group = groups.get(groupKey)
			if (group) {
				group.permissions.push({
					id: perm.id,
					name: perm.name,
					description: perm.description ?? '',
				})
			}
		}

		return Array.from(groups.values())
	}

	/**
	 * Get permissions categorized by type (for admin UI)
	 */
	getCategorized(): CategorizedPermissions {
		const all = this.getGrouped()

		return {
			collectionTypes: all.filter((g) => g.apiId?.startsWith('api::')),
			plugins: all.filter((g) => g.apiId?.startsWith('plugin::')),
			system: all.filter(
				(g) => g.apiId?.startsWith('system::') || !g.apiId?.includes('::'),
			),
		}
	}

	/**
	 * Get permissions for a specific schema
	 */
	getSchemaPermissions(schemaName: string): PermissionDefinition[] {
		return this.getAll().filter(
			(p) =>
				p.schema?.toLowerCase() === schemaName.toLowerCase() ||
				p.apiId === `api::${schemaName}`,
		)
	}

	/**
	 * Get permissions for a specific plugin
	 */
	getPluginPermissions(pluginName: string): PermissionDefinition[] {
		return this.getAll().filter(
			(p) => p.plugin === pluginName || p.apiId === `plugin::${pluginName}`,
		)
	}

	/**
	 * Mark permissions as checked/unchecked based on role's permissions
	 */
	markPermissions(
		groups: PermissionGroup[],
		rolePermissions: string[],
	): PermissionGroup[] {
		return groups.map((group) => ({
			...group,
			permissions: group.permissions.map((p) => ({
				...p,
				checked: this.isPermissionEnabled(rolePermissions, p.id),
			})),
		}))
	}

	/**
	 * Check if a permission is enabled (including wildcard matching)
	 */
	private isPermissionEnabled(
		rolePermissions: string[],
		permissionId: string,
	): boolean {
		// Check for global wildcard
		if (rolePermissions.includes('*')) return true

		// Check for exact match
		if (rolePermissions.includes(permissionId)) return true

		// Check for category wildcards (e.g., 'content.*' matches 'content.posts.create')
		const parts = permissionId.split('.')
		for (let i = parts.length - 1; i > 0; i--) {
			const wildcard = [...parts.slice(0, i), '*'].join('.')
			if (rolePermissions.includes(wildcard)) return true
		}

		return false
	}

	/**
	 * Get human-readable action label
	 */
	private getActionLabel(action: string): string {
		const labels: Record<string, string> = {
			find: 'List',
			findOne: 'View',
			create: 'Create',
			update: 'Update',
			delete: 'Delete',
			publish: 'Publish',
		}
		return labels[action] ?? action
	}

	/**
	 * Format permission ID into a readable name
	 */
	private formatPermissionName(permId: string): string {
		const parts = permId.split('.')
		const lastPart = parts[parts.length - 1] ?? permId
		return lastPart
			.replace(/[-_]/g, ' ')
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(' ')
	}
}
