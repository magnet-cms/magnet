// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser'
import type * as Config from '../source.config'

const create = browser<
	typeof Config,
	import('fumadocs-mdx/runtime/types').InternalTypeConfig & {
		DocData: {}
	}
>()
const browserCollections = {
	docs: create.doc('docs', {
		'index.mdx': () => import('../content/docs/index.mdx?collection=docs'),
		'adapters/index.mdx': () =>
			import('../content/docs/adapters/index.mdx?collection=docs'),
		'adapters/mongoose.mdx': () =>
			import('../content/docs/adapters/mongoose.mdx?collection=docs'),
		'client/admin.mdx': () =>
			import('../content/docs/client/admin.mdx?collection=docs'),
		'client/index.mdx': () =>
			import('../content/docs/client/index.mdx?collection=docs'),
		'client/ui.mdx': () =>
			import('../content/docs/client/ui.mdx?collection=docs'),
		'common/decorators.mdx': () =>
			import('../content/docs/common/decorators.mdx?collection=docs'),
		'common/field-decorators.mdx': () =>
			import('../content/docs/common/field-decorators.mdx?collection=docs'),
		'common/index.mdx': () =>
			import('../content/docs/common/index.mdx?collection=docs'),
		'core/admin-module.mdx': () =>
			import('../content/docs/core/admin-module.mdx?collection=docs'),
		'core/auth-module.mdx': () =>
			import('../content/docs/core/auth-module.mdx?collection=docs'),
		'core/content-module.mdx': () =>
			import('../content/docs/core/content-module.mdx?collection=docs'),
		'core/database-module.mdx': () =>
			import('../content/docs/core/database-module.mdx?collection=docs'),
		'core/index.mdx': () =>
			import('../content/docs/core/index.mdx?collection=docs'),
		'getting-started/index.mdx': () =>
			import('../content/docs/getting-started/index.mdx?collection=docs'),
		'getting-started/installation.mdx': () =>
			import(
				'../content/docs/getting-started/installation.mdx?collection=docs'
			),
		'getting-started/quick-start.mdx': () =>
			import('../content/docs/getting-started/quick-start.mdx?collection=docs'),
		'guides/nextjs-integration.mdx': () =>
			import('../content/docs/guides/nextjs-integration.mdx?collection=docs'),
		'plugins/content-builder.mdx': () =>
			import('../content/docs/plugins/content-builder.mdx?collection=docs'),
		'plugins/index.mdx': () =>
			import('../content/docs/plugins/index.mdx?collection=docs'),
		'plugins/seo.mdx': () =>
			import('../content/docs/plugins/seo.mdx?collection=docs'),
	}),
}
export default browserCollections
