import { RestrictedRoute } from '@magnet/core'
import {
	Body,
	Controller,
	Delete,
	Get,
	HttpException,
	HttpStatus,
	Param,
	Post,
	Put,
} from '@nestjs/common'
import type { CreateSchemaDto } from './dto/schema.dto'
import { PlaygroundService } from './playground.service'

@Controller('playground')
@RestrictedRoute()
export class PlaygroundController {
	constructor(private readonly playgroundService: PlaygroundService) {}

	/**
	 * List all schemas
	 * GET /playground/schemas
	 */
	@Get('schemas')
	async listSchemas() {
		try {
			return await this.playgroundService.listSchemas()
		} catch (error) {
			throw new HttpException(
				error instanceof Error ? error.message : 'Failed to list schemas',
				HttpStatus.INTERNAL_SERVER_ERROR,
			)
		}
	}

	/**
	 * Get a schema by name
	 * GET /playground/schemas/:name
	 */
	@Get('schemas/:name')
	async getSchema(@Param('name') name: string) {
		try {
			const schema = await this.playgroundService.getSchema(name)
			if (!schema) {
				throw new HttpException('Schema not found', HttpStatus.NOT_FOUND)
			}
			return schema
		} catch (error) {
			if (error instanceof HttpException) throw error
			throw new HttpException(
				error instanceof Error ? error.message : 'Failed to get schema',
				HttpStatus.INTERNAL_SERVER_ERROR,
			)
		}
	}

	/**
	 * Create a new module with schema, controller, service, and DTO
	 * POST /playground/schemas
	 */
	@Post('schemas')
	async createSchema(@Body() body: CreateSchemaDto) {
		try {
			// Validate schema name
			if (!body.name || !/^[A-Z][A-Za-z0-9]*$/.test(body.name)) {
				throw new HttpException(
					'Invalid schema name. Must start with uppercase letter and contain only alphanumeric characters.',
					HttpStatus.BAD_REQUEST,
				)
			}

			// Check if module already exists
			if (this.playgroundService.schemaExists(body.name)) {
				throw new HttpException(
					'Module with this name already exists. Use PUT to update the schema.',
					HttpStatus.CONFLICT,
				)
			}

			// Create full module (schema, controller, service, module, dto)
			return await this.playgroundService.createModule(body)
		} catch (error) {
			if (error instanceof HttpException) throw error
			throw new HttpException(
				error instanceof Error ? error.message : 'Failed to create module',
				HttpStatus.INTERNAL_SERVER_ERROR,
			)
		}
	}

	/**
	 * Update an existing schema (only the schema file, not the whole module)
	 * Returns conflicts if field types have changed
	 * PUT /playground/schemas/:name
	 */
	@Put('schemas/:name')
	async updateSchema(
		@Param('name') name: string,
		@Body() body: CreateSchemaDto,
	) {
		try {
			// Validate schema name
			if (!body.name || !/^[A-Z][A-Za-z0-9]*$/.test(body.name)) {
				throw new HttpException(
					'Invalid schema name. Must start with uppercase letter and contain only alphanumeric characters.',
					HttpStatus.BAD_REQUEST,
				)
			}

			// Check if schema exists
			if (!this.playgroundService.schemaExists(name)) {
				throw new HttpException(
					'Schema not found. Use POST to create a new module.',
					HttpStatus.NOT_FOUND,
				)
			}

			// Renaming is not supported for existing schemas (would require updating all imports)
			if (body.name.toLowerCase() !== name.toLowerCase()) {
				throw new HttpException(
					'Renaming schemas is not supported. Create a new module instead.',
					HttpStatus.BAD_REQUEST,
				)
			}

			// Update only the schema file, return conflicts for DTO updates
			const result = await this.playgroundService.updateSchema(name, body)
			return {
				...result.detail,
				conflicts: result.conflicts,
			}
		} catch (error) {
			if (error instanceof HttpException) throw error
			throw new HttpException(
				error instanceof Error ? error.message : 'Failed to update schema',
				HttpStatus.INTERNAL_SERVER_ERROR,
			)
		}
	}

	/**
	 * Delete a schema
	 * DELETE /playground/schemas/:name
	 */
	@Delete('schemas/:name')
	async deleteSchema(@Param('name') name: string) {
		try {
			const deleted = await this.playgroundService.deleteSchema(name)
			if (!deleted) {
				throw new HttpException('Schema not found', HttpStatus.NOT_FOUND)
			}
			return { success: true }
		} catch (error) {
			if (error instanceof HttpException) throw error
			throw new HttpException(
				error instanceof Error ? error.message : 'Failed to delete schema',
				HttpStatus.INTERNAL_SERVER_ERROR,
			)
		}
	}

	/**
	 * Generate code preview without saving
	 * POST /playground/preview
	 */
	@Post('preview')
	previewCode(@Body() body: CreateSchemaDto) {
		try {
			return this.playgroundService.previewCode(body)
		} catch (error) {
			throw new HttpException(
				error instanceof Error ? error.message : 'Failed to generate preview',
				HttpStatus.INTERNAL_SERVER_ERROR,
			)
		}
	}
}
