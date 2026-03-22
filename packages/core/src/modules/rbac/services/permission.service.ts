import type { PermissionDefinition } from '@magnet-cms/common'
import { InjectModel, Model } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { MagnetLogger } from '~/modules/logging/logger.service'
import { Permission } from '../schemas/permission.schema'

export interface ValidatePermissionIdsResult {
	valid: string[]
	invalid: string[]
}

/**
 * Service for persisting and validating permissions.
 *
 * Permissions are synced from PermissionDiscoveryService on startup
 * and used to validate role permission assignments.
 */
@Injectable()
export class PermissionService {
	constructor(
		@InjectModel(Permission)
		private readonly permissionModel: Model<Permission>,
		private readonly logger: MagnetLogger,
	) {
		this.logger.setContext(PermissionService.name)
	}

	/**
	 * Upsert a single permission from a definition
	 */
	async upsertFromDefinition(def: PermissionDefinition): Promise<void> {
		const existing = await this.permissionModel.findOne({
			permissionId: def.id,
		} as Partial<Permission>)

		const data = this.definitionToPermissionData(def)
		const now = new Date()

		if (existing) {
			await this.permissionModel.update(
				{ id: existing.id } as Partial<Permission>,
				{
					...data,
					updatedAt: now,
				},
			)
		} else {
			await this.permissionModel.create({
				...data,
				createdAt: now,
			} as Partial<Permission>)
		}
	}

	/**
	 * Batch upsert permissions from definitions
	 */
	async upsertMany(definitions: PermissionDefinition[]): Promise<void> {
		// Filter out dynamic permissions (with placeholders like {schema})
		const staticDefs = definitions.filter((d) => !d.id.includes('{'))

		if (staticDefs.length === 0) return

		this.logger.log(`Syncing ${staticDefs.length} permissions to database...`)

		for (const def of staticDefs) {
			try {
				await this.upsertFromDefinition(def)
			} catch (error) {
				this.logger.warn(
					`Failed to upsert permission ${def.id}: ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}

		this.logger.log('Permission sync completed')
	}

	/**
	 * Find a permission by ID
	 */
	async findById(permissionId: string): Promise<Permission | null> {
		return this.permissionModel.findOne({
			permissionId,
		} as Partial<Permission>)
	}

	/**
	 * Get all registered permission IDs
	 */
	async findAllIds(): Promise<string[]> {
		const permissions = await this.permissionModel.find()
		return permissions.map((p) => p.permissionId)
	}

	/**
	 * Validate that all permission IDs exist (in DB or can be matched by wildcard)
	 * Returns valid and invalid IDs.
	 */
	async validatePermissionIds(
		ids: string[],
		knownIds?: string[],
	): Promise<ValidatePermissionIdsResult> {
		const registeredIds = knownIds ?? (await this.findAllIds())
		const valid: string[] = []
		const invalid: string[] = []

		for (const id of ids) {
			// Allow wildcard permissions
			if (id === '*' || id.endsWith('.*')) {
				valid.push(id)
				continue
			}

			if (registeredIds.includes(id)) {
				valid.push(id)
			} else {
				invalid.push(id)
			}
		}

		return { valid, invalid }
	}

	private definitionToPermissionData(
		def: PermissionDefinition,
	): Omit<Permission, 'createdAt' | 'updatedAt'> {
		return {
			permissionId: def.id,
			name: def.name,
			description: def.description,
			group: def.group,
			apiId: def.apiId,
			source: def.source,
			controller: def.controller,
			method: def.method,
			plugin: def.plugin,
			schema: def.schema,
		}
	}
}
