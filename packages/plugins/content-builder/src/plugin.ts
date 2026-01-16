import { Plugin } from '@magnet-cms/core'
import { ContentBuilderModule } from './backend/content-builder.module'

/**
 * Content Builder Plugin
 *
 * Provides a visual schema builder (Playground) for creating and managing
 * content schemas without writing code.
 *
 * Features:
 * - Visual schema editor with drag-and-drop field management
 * - Real-time TypeScript code generation
 * - Automatic module, controller, service, and DTO generation
 * - Schema versioning and i18n support configuration
 */
@Plugin({
	name: 'content-builder',
	description: 'Visual schema builder and code generator for Magnet CMS',
	version: '1.0.0',
	module: ContentBuilderModule,
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
export class ContentBuilderPlugin {}
