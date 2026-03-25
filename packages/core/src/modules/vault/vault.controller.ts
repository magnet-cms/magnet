import type { VaultAdapterType, VaultSecretMeta, VaultStatusResponse } from '@magnet-cms/common'
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

import { VaultService } from './vault.service'

import { RestrictedRoute } from '~/decorators/restricted.route'

interface SetSecretDto {
  value: string
  description?: string
}

interface VaultSecretResponse {
  name: string
  value: string
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
   * List all secrets with metadata, optionally filtered by prefix.
   */
  @Get('secrets')
  async listSecrets(@Query('prefix') prefix?: string): Promise<{ secrets: VaultSecretMeta[] }> {
    const secrets = await this.vaultService.list(prefix)
    return { secrets }
  }

  /**
   * GET /vault/secrets/:key
   * Retrieve a secret value by key (decrypted).
   */
  @Get('secrets/:key')
  async getSecret(@Param('key') key: string): Promise<VaultSecretResponse> {
    const value = await this.vaultService.get(key)
    return { name: key, value: value ?? '' }
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
    await this.vaultService.set(key, body.value, body.description)
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
