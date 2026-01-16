import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { Controller, Get, Logger, Param, Res } from '@nestjs/common'
import type { Response } from 'express'

/**
 * Controller for serving plugin frontend assets
 *
 * Serves pre-built plugin frontend bundles from node_modules
 * so they can be dynamically loaded by the admin UI at runtime.
 */
@Controller('plugins/assets')
export class PluginAssetsController {
	private readonly logger = new Logger(PluginAssetsController.name)

	/**
	 * Serve a plugin frontend asset
	 * GET /plugins/assets/:pluginName/*path
	 *
	 * @example GET /plugins/assets/content-builder/bundle.umd.js
	 */
	@Get(':pluginName/*path')
	servePluginAsset(
		@Param('pluginName') pluginName: string,
		@Param('path') assetPath: string,
		@Res() res: Response,
	) {
		const pluginPackageName = `@magnet-cms/plugin-${pluginName}`
		const pluginPath = this.resolvePluginPath(pluginPackageName)

		if (!pluginPath) {
			this.logger.warn(`Plugin not found: ${pluginPackageName}`)
			return res.status(404).json({
				error: 'Plugin not found',
				plugin: pluginName,
			})
		}

		// Assets are expected to be in dist/frontend/
		const fullPath = resolve(pluginPath, 'dist', 'frontend', assetPath)

		this.logger.log(`Serving plugin asset: ${fullPath}`)

		if (!existsSync(fullPath)) {
			this.logger.warn(`Asset not found: ${fullPath}`)
			return res.status(404).json({
				error: 'Asset not found',
				plugin: pluginName,
				path: assetPath,
			})
		}

		// Set appropriate content type based on extension
		const ext = assetPath.split('.').pop()?.toLowerCase()
		const contentTypes: Record<string, string> = {
			js: 'application/javascript',
			mjs: 'application/javascript',
			css: 'text/css',
			json: 'application/json',
			map: 'application/json',
		}

		if (ext && contentTypes[ext]) {
			res.setHeader('Content-Type', contentTypes[ext])
		}

		// Cache for 1 hour in production, no cache in development
		if (process.env.NODE_ENV === 'production') {
			res.setHeader('Cache-Control', 'public, max-age=3600')
		} else {
			res.setHeader('Cache-Control', 'no-cache')
		}

		return res.sendFile(fullPath)
	}

	/**
	 * Resolve the filesystem path to a plugin package
	 */
	private resolvePluginPath(packageName: string): string | null {
		const possiblePaths = [
			// Monorepo development
			resolve(
				process.cwd(),
				'../../packages/plugins',
				packageName.replace('@magnet-cms/plugin-', ''),
			),
			resolve(
				process.cwd(),
				'../packages/plugins',
				packageName.replace('@magnet-cms/plugin-', ''),
			),
			// Installed as dependency
			resolve(process.cwd(), 'node_modules', packageName),
		]

		for (const path of possiblePaths) {
			if (existsSync(path)) {
				return path
			}
		}

		return null
	}
}
