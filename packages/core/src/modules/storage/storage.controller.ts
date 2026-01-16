import type { MediaQueryOptions } from '@magnet/common'
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
	Query,
	Req,
	UploadedFile,
	UploadedFiles,
	UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import type { Request } from 'express'
import { RestrictedRoute } from '~/decorators/restricted.route'
import { StorageService } from './storage.service'

// DTO for update operations
interface UpdateMediaDto {
	alt?: string
	tags?: string[]
	folder?: string
	customFields?: Record<string, unknown>
}

// DTO for bulk delete
interface DeleteManyDto {
	ids: string[]
}

@Controller('media')
@RestrictedRoute()
export class StorageController {
	constructor(private readonly storageService: StorageService) {}

	/**
	 * Upload a single file
	 * POST /media/upload
	 */
	@Post('upload')
	@UseInterceptors(
		FileInterceptor('file', {
			limits: {
				fileSize: 50 * 1024 * 1024, // 50MB default
			},
		}),
	)
	async upload(
		@UploadedFile() file: Express.Multer.File,
		@Body('folder') folder?: string,
		@Body('tags') tagsJson?: string,
		@Body('alt') alt?: string,
		@Req() req?: Request,
	) {
		if (!file) {
			throw new HttpException('No file provided', HttpStatus.BAD_REQUEST)
		}

		try {
			const tags = tagsJson ? JSON.parse(tagsJson) : undefined
			const userId = (req as any)?.user?.id

			const result = await this.storageService.upload(
				file.buffer,
				file.originalname,
				{
					mimeType: file.mimetype,
					folder,
					tags,
					alt,
					createdBy: userId,
				},
			)

			return result
		} catch (error) {
			throw new HttpException(
				error instanceof Error ? error.message : 'Upload failed',
				HttpStatus.BAD_REQUEST,
			)
		}
	}

	/**
	 * Upload multiple files
	 * POST /media/upload-multiple
	 */
	@Post('upload-multiple')
	@UseInterceptors(
		FilesInterceptor('files', 10, {
			limits: {
				fileSize: 50 * 1024 * 1024, // 50MB per file
			},
		}),
	)
	async uploadMultiple(
		@UploadedFiles() files: Express.Multer.File[],
		@Body('folder') folder?: string,
		@Req() req?: Request,
	) {
		if (!files || files.length === 0) {
			throw new HttpException('No files provided', HttpStatus.BAD_REQUEST)
		}

		try {
			const userId = (req as any)?.user?.id

			const results = await this.storageService.uploadMany(
				files.map((file) => ({
					file: file.buffer,
					originalFilename: file.originalname,
				})),
				{
					folder,
					createdBy: userId,
				},
			)

			return results
		} catch (error) {
			throw new HttpException(
				error instanceof Error ? error.message : 'Upload failed',
				HttpStatus.BAD_REQUEST,
			)
		}
	}

	/**
	 * List media with pagination and filtering
	 * GET /media
	 */
	@Get()
	async list(
		@Query('page') page?: string,
		@Query('limit') limit?: string,
		@Query('folder') folder?: string,
		@Query('mimeType') mimeType?: string,
		@Query('tags') tags?: string,
		@Query('search') search?: string,
		@Query('sortBy') sortBy?: 'createdAt' | 'filename' | 'size',
		@Query('sortOrder') sortOrder?: 'asc' | 'desc',
	) {
		const options: MediaQueryOptions = {
			page: page ? Number.parseInt(page, 10) : undefined,
			limit: limit ? Number.parseInt(limit, 10) : undefined,
			folder,
			mimeType,
			tags: tags ? tags.split(',').filter(Boolean) : undefined,
			search,
			sortBy,
			sortOrder,
		}

		return this.storageService.list(options)
	}

	/**
	 * Get media by ID
	 * GET /media/:id
	 */
	@Get(':id')
	async get(@Param('id') id: string) {
		const media = await this.storageService.findById(id)
		if (!media) {
			throw new HttpException('Media not found', HttpStatus.NOT_FOUND)
		}
		return media
	}

	/**
	 * Update media metadata
	 * PUT /media/:id
	 */
	@Put(':id')
	async update(@Param('id') id: string, @Body() body: UpdateMediaDto) {
		try {
			const result = await this.storageService.update(id, body)
			if (!result) {
				throw new HttpException('Media not found', HttpStatus.NOT_FOUND)
			}
			return result
		} catch (error) {
			if (error instanceof HttpException) throw error
			throw new HttpException(
				error instanceof Error ? error.message : 'Update failed',
				HttpStatus.BAD_REQUEST,
			)
		}
	}

	/**
	 * Delete media
	 * DELETE /media/:id
	 */
	@Delete(':id')
	async delete(@Param('id') id: string) {
		const success = await this.storageService.delete(id)
		if (!success) {
			throw new HttpException('Media not found', HttpStatus.NOT_FOUND)
		}
		return { success: true }
	}

	/**
	 * Delete multiple media
	 * POST /media/delete-many
	 */
	@Post('delete-many')
	async deleteMany(@Body() body: DeleteManyDto) {
		if (!body.ids || body.ids.length === 0) {
			throw new HttpException('No IDs provided', HttpStatus.BAD_REQUEST)
		}

		return this.storageService.deleteMany(body.ids)
	}

	/**
	 * Get available folders
	 * GET /media/meta/folders
	 */
	@Get('meta/folders')
	async getFolders() {
		return this.storageService.getFolders()
	}

	/**
	 * Get available tags
	 * GET /media/meta/tags
	 */
	@Get('meta/tags')
	async getTags() {
		return this.storageService.getTags()
	}

	/**
	 * Get storage statistics
	 * GET /media/meta/stats
	 */
	@Get('meta/stats')
	async getStats() {
		return this.storageService.getStats()
	}
}
