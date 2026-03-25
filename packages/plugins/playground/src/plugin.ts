import type { PluginMagnetProvider } from '@magnet-cms/common'
import { Plugin } from '@magnet-cms/core'

/**
 * Playground plugin (`@magnet-cms/plugin-playground`)
 *
 * Provides the Playground UI for creating and managing content schemas without
 * writing code: visual editor, TypeScript generation, and NestJS module output.
 *
 * Features:
 * - Visual schema editor with drag-and-drop field management
 * - Real-time TypeScript code generation
 * - Automatic module, controller, service, and DTO generation
 * - Schema versioning and i18n support configuration
 *
 * The admin UI loads Playground from `dist/frontend/bundle.iife.js`. Build this
 * package (`bun run build` here or via the monorepo) before expecting Playground
 * in the sidebar.
 */
@Plugin({
  name: 'playground',
  description: 'Playground: visual schema builder and code generator for Magnet CMS',
  version: '1.0.0',
  module: () => require('./backend/playground.module').PlaygroundModule,
  frontend: {
    routes: [
      {
        path: 'playground',
        componentId: 'PlaygroundIndex',
        requiresAuth: true,
        children: [
          { path: '', componentId: 'PlaygroundIndex' },
          { path: 'new', componentId: 'PlaygroundEditor' },
          { path: ':schemaName', componentId: 'PlaygroundEditor' },
        ],
      },
    ],
    sidebar: [
      {
        id: 'playground',
        title: 'Playground',
        url: '/playground',
        icon: 'Boxes',
        order: 20,
      },
    ],
  },
})
export class PlaygroundPlugin {
  /**
   * Create a configured plugin provider for MagnetModule.forRoot().
   *
   * @example
   * ```typescript
   * MagnetModule.forRoot([
   *   PlaygroundPlugin.forRoot(),
   * ])
   * ```
   */
  static forRoot(config?: { modulesPath?: string }): PluginMagnetProvider {
    return {
      type: 'plugin',
      plugin: PlaygroundPlugin,
      options: config as Record<string, unknown> | undefined,
      envVars: [],
    }
  }
}
