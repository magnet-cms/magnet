import {
	Body,
	Controller,
	Get,
	Injectable,
	Logger,
	Param,
	Post,
	Put,
	UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import type {
	VaultSecretMapping,
	VaultStatusResponse,
	VaultTestConnectionResponse,
} from './types'
import { VaultClient } from './vault.client'
import { VaultService } from './vault.service'

/**
 * JWT auth guard for vault endpoints.
 * Requires a valid JWT token in the Authorization header.
 */
@Injectable()
class VaultJwtAuthGuard extends AuthGuard('jwt') {}

/**
 * Vault admin controller for connection management and secret browsing.
 *
 * All endpoints require JWT authentication.
 */
@Controller('vault')
@UseGuards(VaultJwtAuthGuard)
export class VaultController {
	private readonly logger = new Logger(VaultController.name)

	constructor(private readonly vaultService: VaultService) {}

	/**
	 * GET /vault/status
	 *
	 * Returns Vault connection status and configuration summary.
	 */
	@Get('status')
	async getStatus(): Promise<VaultStatusResponse> {
		const configured = this.vaultService.isConfigured()
		let connected = false

		if (configured) {
			try {
				connected = await this.vaultService.healthCheck()
			} catch {
				connected = false
			}
		}

		return {
			configured,
			connected,
			url: configured ? '***configured***' : null,
			authMethod: configured ? 'configured' : null,
			mountPath: 'secret',
		}
	}

	/**
	 * POST /vault/test-connection
	 *
	 * Test Vault connectivity. If a URL is provided in the body,
	 * tests that specific URL without modifying the active configuration.
	 * Otherwise tests the currently configured Vault connection.
	 */
	@Post('test-connection')
	async testConnection(
		@Body() body?: { url?: string },
	): Promise<VaultTestConnectionResponse> {
		// If a custom URL is provided, test it directly
		if (body?.url) {
			try {
				const tempClient = new VaultClient({
					url: body.url,
					auth: { type: 'token', token: 'test' },
				})
				const healthy = await tempClient.healthCheck()
				if (healthy) {
					return { success: true }
				}
				return {
					success: false,
					error:
						'Vault server responded but is not healthy (may be sealed or uninitialized)',
				}
			} catch (error) {
				return {
					success: false,
					error: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
				}
			}
		}

		// Test the currently configured connection
		if (!this.vaultService.isConfigured()) {
			return {
				success: false,
				error:
					'Vault is not configured. Set VAULT_ADDR and VAULT_TOKEN environment variables.',
			}
		}

		try {
			const healthy = await this.vaultService.healthCheck()
			if (healthy) {
				return { success: true }
			}
			return {
				success: false,
				error:
					'Vault server responded but is not healthy (may be sealed or uninitialized)',
			}
		} catch (error) {
			return {
				success: false,
				error: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
			}
		}
	}

	/**
	 * GET /vault/secrets
	 *
	 * List secret paths at the configured mount point.
	 */
	@Get('secrets')
	async listSecrets(): Promise<{ paths: string[] }> {
		if (!this.vaultService.isConfigured()) {
			return { paths: [] }
		}

		const paths = await this.vaultService.listSecrets('')
		return { paths }
	}

	/**
	 * GET /vault/secrets/:path
	 *
	 * Read secret key names (NOT values) at the given path.
	 */
	@Get('secrets/:path(*)')
	async getSecretKeys(
		@Param('path') path: string,
	): Promise<{ keys: string[] }> {
		if (!this.vaultService.isConfigured()) {
			return { keys: [] }
		}

		const keys = await this.vaultService.getSecretKeys(path)
		return { keys }
	}

	/**
	 * GET /vault/mappings
	 *
	 * List configured secret mappings from service config.
	 */
	@Get('mappings')
	getMappings(): { mappings: VaultSecretMapping[] } {
		return { mappings: this.vaultService.getMappings() }
	}

	/**
	 * PUT /vault/mappings
	 *
	 * Update secret mappings in the service.
	 */
	@Put('mappings')
	updateMappings(@Body() body: { mappings: VaultSecretMapping[] }): {
		mappings: VaultSecretMapping[]
	} {
		const mappings = body.mappings ?? []

		// Filter to only valid entries
		const validMappings = mappings.filter((m) => m.path && m.mapTo)

		if (validMappings.length < mappings.length) {
			this.logger.warn(
				`Filtered ${mappings.length - validMappings.length} invalid mapping entries (missing path or mapTo)`,
			)
		}

		this.vaultService.setMappings(validMappings)
		return { mappings: validMappings }
	}
}
