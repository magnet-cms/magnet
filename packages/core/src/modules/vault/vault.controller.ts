import type { VaultAdapterType, VaultStatusResponse } from '@magnet-cms/common'
import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
	Query,
} from '@nestjs/common'
import { RestrictedRoute } from '~/decorators/restricted.route'
import { VaultService } from './vault.service'

interface SetSecretDto {
	data: Record<string, unknown>
}

interface VaultSecretResponse {
	key: string
	data: Record<string, unknown>
}

/**
 * Admin REST API for the vault module.
 *
 * All endpoints require authentication (RestrictedRoute).
 * Secret values are returned decrypted — access should be limited to trusted admins.
 */
@Controller('vault')
@RestrictedRoute()
export class VaultController {
	constructor(private readonly vaultService: VaultService) {}

	/**
	 * GET /vault/status
	 * Returns adapter type, health status, and master key configuration.
	 */
	@Get('status')
	async getStatus(): Promise<VaultStatusResponse> {
		const [healthy, adapterType] = await Promise.all([
			this.vaultService.healthCheck(),
			Promise.resolve(this.vaultService.getAdapterType()),
		])

		const response: VaultStatusResponse = {
			healthy,
			adapter: adapterType as VaultAdapterType,
		}

		if (adapterType === 'db') {
			response.masterKeyConfigured = this.vaultService.isMasterKeyConfigured()
		}

		return response
	}

	/**
	 * GET /vault/secrets
	 * List all secret keys, optionally filtered by prefix.
	 */
	@Get('secrets')
	async listSecrets(
		@Query('prefix') prefix?: string,
	): Promise<{ keys: string[] }> {
		const keys = await this.vaultService.list(prefix)
		return { keys }
	}

	/**
	 * GET /vault/secrets/:key
	 * Retrieve a secret by key (decrypted).
	 */
	@Get('secrets/:key')
	async getSecret(@Param('key') key: string): Promise<VaultSecretResponse> {
		const data = await this.vaultService.get(key)
		if (!data) {
			return { key, data: {} }
		}
		return { key, data }
	}

	/**
	 * POST /vault/secrets/:key
	 * Create or update a secret.
	 */
	@Post('secrets/:key')
	@HttpCode(HttpStatus.OK)
	async setSecret(
		@Param('key') key: string,
		@Body() body: SetSecretDto,
	): Promise<{ success: boolean }> {
		await this.vaultService.set(key, body.data)
		return { success: true }
	}

	/**
	 * DELETE /vault/secrets/:key
	 * Delete a secret.
	 */
	@Delete('secrets/:key')
	async deleteSecret(@Param('key') key: string): Promise<{ success: boolean }> {
		await this.vaultService.delete(key)
		return { success: true }
	}

	/**
	 * POST /vault/cache/clear
	 * Clear the in-memory secret cache.
	 */
	@Post('cache/clear')
	@HttpCode(HttpStatus.OK)
	clearCache(): { success: boolean } {
		this.vaultService.clearCache()
		return { success: true }
	}
}
