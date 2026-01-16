import type { TransformOptions } from '@magnet-cms/common'
import {
	Controller,
	Get,
	HttpException,
	HttpStatus,
	Param,
	Query,
	Res,
} from '@nestjs/common'
import type { Response } from 'express'
import { StorageService } from './storage.service'

/**
 * Controller for serving media files with optional on-demand transforms.
 * These endpoints are PUBLIC (no auth required) for serving media files.
 */
@Controller('media')
export class TransformController {
	constructor(private readonly storageService: StorageService) {}

	/**
	 * Serve a media file with optional image transforms
	 * GET /media/file/:id
	 *
	 * Query parameters:
	 * - w: width in pixels
	 * - h: height in pixels
	 * - fit: cover | contain | fill | inside | outside
	 * - f: format (jpeg | png | webp | avif)
	 * - q: quality (1-100)
	 *
	 * Examples:
	 * - /media/file/abc123 - serve original
	 * - /media/file/abc123?w=200 - resize to 200px width
	 * - /media/file/abc123?w=200&h=200&fit=cover - resize and crop
	 * - /media/file/abc123?f=webp&q=80 - convert to WebP at 80% quality
	 */
	@Get('file/:id')
	async getFile(
		@Param('id') id: string,
		@Query('w') width?: string,
		@Query('h') height?: string,
		@Query('fit') fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside',
		@Query('f') format?: 'jpeg' | 'png' | 'webp' | 'avif',
		@Query('q') quality?: string,
		@Res() res?: Response,
	) {
		if (!res) {
			throw new HttpException(
				'Response object required',
				HttpStatus.INTERNAL_SERVER_ERROR,
			)
		}

		try {
			const media = await this.storageService.findById(id)
			if (!media) {
				throw new HttpException('Media not found', HttpStatus.NOT_FOUND)
			}

			const hasTransform = width || height || format || quality
			const isImage =
				media.mimeType.startsWith('image/') &&
				media.mimeType !== 'image/svg+xml'

			if (hasTransform && isImage) {
				// Build transform options
				const transformOptions: TransformOptions = {}
				if (width) transformOptions.width = Number.parseInt(width, 10)
				if (height) transformOptions.height = Number.parseInt(height, 10)
				if (fit) transformOptions.fit = fit
				if (format) transformOptions.format = format
				if (quality) transformOptions.quality = Number.parseInt(quality, 10)

				// Validate transform options
				if (
					transformOptions.width &&
					(transformOptions.width < 1 || transformOptions.width > 4000)
				) {
					throw new HttpException(
						'Invalid width (must be 1-4000)',
						HttpStatus.BAD_REQUEST,
					)
				}
				if (
					transformOptions.height &&
					(transformOptions.height < 1 || transformOptions.height > 4000)
				) {
					throw new HttpException(
						'Invalid height (must be 1-4000)',
						HttpStatus.BAD_REQUEST,
					)
				}
				if (
					transformOptions.quality &&
					(transformOptions.quality < 1 || transformOptions.quality > 100)
				) {
					throw new HttpException(
						'Invalid quality (must be 1-100)',
						HttpStatus.BAD_REQUEST,
					)
				}

				// Get transformed image
				const buffer = await this.storageService.transform(id, transformOptions)

				// Determine content type
				let contentType = media.mimeType
				if (format) {
					const formatMimeTypes: Record<string, string> = {
						jpeg: 'image/jpeg',
						png: 'image/png',
						webp: 'image/webp',
						avif: 'image/avif',
					}
					contentType = formatMimeTypes[format] || media.mimeType
				}

				res.setHeader('Content-Type', contentType)
				res.setHeader('Content-Length', buffer.length)
				res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
				res.setHeader(
					'ETag',
					`"${id}-${width || ''}-${height || ''}-${fit || ''}-${format || ''}-${quality || ''}"`,
				)
				res.send(buffer)
			} else {
				// Serve original file
				const stream = await this.storageService.getStream(id)

				res.setHeader('Content-Type', media.mimeType)
				res.setHeader('Content-Length', media.size)
				res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
				res.setHeader('ETag', `"${id}"`)

				stream.pipe(res)
			}
		} catch (error) {
			if (error instanceof HttpException) throw error
			throw new HttpException(
				error instanceof Error ? error.message : 'Failed to serve file',
				HttpStatus.INTERNAL_SERVER_ERROR,
			)
		}
	}

	/**
	 * Download a media file with original filename
	 * GET /media/download/:id
	 */
	@Get('download/:id')
	async download(@Param('id') id: string, @Res() res?: Response) {
		if (!res) {
			throw new HttpException(
				'Response object required',
				HttpStatus.INTERNAL_SERVER_ERROR,
			)
		}

		try {
			const media = await this.storageService.findById(id)
			if (!media) {
				throw new HttpException('Media not found', HttpStatus.NOT_FOUND)
			}

			const stream = await this.storageService.getStream(id)

			res.setHeader('Content-Type', media.mimeType)
			res.setHeader('Content-Length', media.size)
			res.setHeader(
				'Content-Disposition',
				`attachment; filename="${encodeURIComponent(media.originalFilename)}"`,
			)

			stream.pipe(res)
		} catch (error) {
			if (error instanceof HttpException) throw error
			throw new HttpException(
				error instanceof Error ? error.message : 'Download failed',
				HttpStatus.INTERNAL_SERVER_ERROR,
			)
		}
	}
}
