import type { MediaQueryOptions } from '@magnet-cms/common'
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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import type { Request } from 'express'

import { MediaOwnerGuard } from './guards/media-owner.guard'
import { StorageService } from './storage.service'

import { RestrictedRoute } from '~/decorators/restricted.route'
import { OptionalDynamicAuthGuard } from '~/modules/auth/guards/dynamic-auth.guard'

interface AuthenticatedRequest extends Request {
  user?: { id: string }
}

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

// DTO for folder creation
interface CreateFolderDto {
  name: string
  parentPath?: string
}

@Controller('media')
@RestrictedRoute()
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Resolve a user's display name by ID
   */
  private async resolveUserName(userId: string | undefined): Promise<string | undefined> {
    if (!userId) return undefined
    try {
      const userService = this.moduleRef.get('UserService', {
        strict: false,
      })
      const user = await userService.findOneById(userId)
      return (user as { name?: string } | null)?.name
    } catch {
      return undefined
    }
  }

  /**
   * Upload a single file
   * POST /media/upload
   *
   * Body params:
   * - folder?: string — target folder path
   * - tags?: string — JSON array of tags
   * - alt?: string — alt text
   * - encrypt?: string — "true" to encrypt with AES-256-GCM (requires auth)
   * - ownerId?: string — user ID for encryption key + access control
   */
  @Post('upload')
  @UseGuards(OptionalDynamicAuthGuard)
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
    @Body('encrypt') encryptStr?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST)
    }

    try {
      const tags = tagsJson ? JSON.parse(tagsJson) : undefined
      const userId = req?.user?.id
      const userName = await this.resolveUserName(userId)
      const encrypt = encryptStr === 'true'

      const result = await this.storageService.upload(file.buffer, file.originalname, {
        mimeType: file.mimetype,
        folder,
        tags,
        alt,
        createdBy: userId,
        createdByName: userName,
        encrypt,
        ownerId: encrypt ? userId : undefined,
      })

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
    @Req() req?: AuthenticatedRequest,
  ) {
    if (!files || files.length === 0) {
      throw new HttpException('No files provided', HttpStatus.BAD_REQUEST)
    }

    try {
      const userId = req?.user?.id
      const userName = await this.resolveUserName(userId)

      const results = await this.storageService.uploadMany(
        files.map((file) => ({
          file: file.buffer,
          originalFilename: file.originalname,
        })),
        {
          folder,
          createdBy: userId,
          createdByName: userName,
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
   * Create a folder
   * POST /media/folders
   */
  @Post('folders')
  async createFolder(@Body() body: CreateFolderDto, @Req() req?: AuthenticatedRequest) {
    if (!body.name || !body.name.trim()) {
      throw new HttpException('Folder name is required', HttpStatus.BAD_REQUEST)
    }

    try {
      const userId = req?.user?.id
      return await this.storageService.createFolder(body.name.trim(), body.parentPath, userId)
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to create folder',
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  /**
   * Delete a folder (must be empty)
   * DELETE /media/folders/:path
   */
  @Delete('folders/*path')
  async deleteFolder(@Param('path') path: string | string[]) {
    // NestJS wildcard route params may return arrays — normalize to string
    const folderPath = Array.isArray(path) ? path.join('/') : path
    try {
      const success = await this.storageService.deleteFolder(folderPath)
      if (!success) {
        throw new HttpException('Folder not found', HttpStatus.NOT_FOUND)
      }
      return { success: true }
    } catch (error) {
      if (error instanceof HttpException) throw error
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to delete folder',
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
  @UseGuards(OptionalDynamicAuthGuard, MediaOwnerGuard)
  async get(@Param('id') id: string) {
    const media = await this.storageService.findById(id)
    if (!media) {
      throw new HttpException('Media not found', HttpStatus.NOT_FOUND)
    }

    // Lazy backfill: resolve user name for older records
    if (media.createdBy && !media.createdByName) {
      const name = await this.resolveUserName(media.createdBy)
      if (name) {
        await this.storageService.update(id, { createdByName: name })
        ;(media as unknown as { createdByName: string }).createdByName = name
      }
    }

    return media
  }

  /**
   * Update media metadata
   * PUT /media/:id
   */
  @Put(':id')
  @UseGuards(OptionalDynamicAuthGuard, MediaOwnerGuard)
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
  @UseGuards(OptionalDynamicAuthGuard, MediaOwnerGuard)
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
