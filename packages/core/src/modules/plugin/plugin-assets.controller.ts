import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { findPathInParentDirectories } from '@magnet-cms/utils/node'
import { Controller, Get, Param, Res } from '@nestjs/common'
import type { Response } from 'express'
import { MagnetLogger } from '~/modules/logging/logger.service'

/**
 * Controller for serving plugin frontend assets
 *
 * Serves pre-built plugin frontend bundles from node_modules
 * so they can be dynamically loaded by the admin UI at runtime.
 */
@Controller('plugins/assets')
export class PluginAssetsController {
	constructor(private readonly logger: MagnetLogger) {
		this.logger.setContext(PluginAssetsController.name)
	}

	/**
	 * Serve a plugin frontend asset
	 * GET /plugins/assets/:pluginName/*path
	 *
	 * @example GET /plugins/assets/playground/bundle.iife.js
	 */
	@Get(':pluginName/*path')
	servePluginAsset(
		@Param('pluginName') pluginName: string,
		@Param('path') assetPath: string | string[],
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

		// NestJS binds `*path` as string[] for multi-segment wildcards; path.resolve requires strings.
		const assetPathStr = Array.isArray(assetPath)
			? assetPath.join('/')
			: assetPath

		// Assets are expected to be in dist/frontend/
		const fullPath = resolve(pluginPath, 'dist', 'frontend', assetPathStr)

		this.logger.log(`Serving plugin asset: ${fullPath}`)

		if (!existsSync(fullPath)) {
			this.logger.warn(`Asset not found: ${fullPath}`)
			return res.status(404).json({
				error: 'Asset not found',
				plugin: pluginName,
				path: assetPathStr,
			})
		}

		// Set appropriate content type based on extension
		const ext = assetPathStr.split('.').pop()?.toLowerCase()
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
		const pluginFolder = packageName.replace('@magnet-cms/plugin-', '')

		// Search for monorepo development paths up to 5 levels
		const monorepoPath = findPathInParentDirectories(
			`packages/plugins/${pluginFolder}`,
		)
		if (monorepoPath) {
			return monorepoPath
		}

		// Installed as dependency
		const nodeModulesPath = resolve(process.cwd(), 'node_modules', packageName)
		if (existsSync(nodeModulesPath)) {
			return nodeModulesPath
		}

		return null
	}
}
