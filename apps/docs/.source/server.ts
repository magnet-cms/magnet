import { server } from 'fumadocs-mdx/runtime/server'
import * as __fd_glob_8 from '../content/docs/adapters/index.mdx?collection=docs'
import { default as __fd_glob_1 } from '../content/docs/adapters/meta.json?collection=docs'
import * as __fd_glob_9 from '../content/docs/adapters/mongoose.mdx?collection=docs'
import * as __fd_glob_12 from '../content/docs/client/admin.mdx?collection=docs'
import * as __fd_glob_13 from '../content/docs/client/index.mdx?collection=docs'
import { default as __fd_glob_2 } from '../content/docs/client/meta.json?collection=docs'
import * as __fd_glob_14 from '../content/docs/client/ui.mdx?collection=docs'
import * as __fd_glob_10 from '../content/docs/common/decorators.mdx?collection=docs'
import * as __fd_glob_11 from '../content/docs/common/index.mdx?collection=docs'
import { default as __fd_glob_3 } from '../content/docs/common/meta.json?collection=docs'
import * as __fd_glob_15 from '../content/docs/core/admin-module.mdx?collection=docs'
import * as __fd_glob_16 from '../content/docs/core/auth-module.mdx?collection=docs'
import * as __fd_glob_17 from '../content/docs/core/content-module.mdx?collection=docs'
import * as __fd_glob_18 from '../content/docs/core/database-module.mdx?collection=docs'
import * as __fd_glob_19 from '../content/docs/core/index.mdx?collection=docs'
import { default as __fd_glob_5 } from '../content/docs/core/meta.json?collection=docs'
import * as __fd_glob_20 from '../content/docs/getting-started/index.mdx?collection=docs'
import * as __fd_glob_21 from '../content/docs/getting-started/installation.mdx?collection=docs'
import { default as __fd_glob_4 } from '../content/docs/getting-started/meta.json?collection=docs'
import * as __fd_glob_22 from '../content/docs/getting-started/quick-start.mdx?collection=docs'
import * as __fd_glob_7 from '../content/docs/index.mdx?collection=docs'
import { default as __fd_glob_0 } from '../content/docs/meta.json?collection=docs'
import * as __fd_glob_23 from '../content/docs/plugins/content-builder.mdx?collection=docs'
import * as __fd_glob_24 from '../content/docs/plugins/index.mdx?collection=docs'
import { default as __fd_glob_6 } from '../content/docs/plugins/meta.json?collection=docs'
// @ts-nocheck
import * as __fd_glob_25 from '../content/docs/plugins/seo.mdx?collection=docs'
import type * as Config from '../source.config'

const create = server<
	typeof Config,
	import('fumadocs-mdx/runtime/types').InternalTypeConfig & {
		DocData: {}
	}
>({ doc: { passthroughs: ['extractedReferences'] } })

export const docs = await create.docs(
	'docs',
	'content/docs',
	{
		'meta.json': __fd_glob_0,
		'adapters/meta.json': __fd_glob_1,
		'client/meta.json': __fd_glob_2,
		'common/meta.json': __fd_glob_3,
		'getting-started/meta.json': __fd_glob_4,
		'core/meta.json': __fd_glob_5,
		'plugins/meta.json': __fd_glob_6,
	},
	{
		'index.mdx': __fd_glob_7,
		'adapters/index.mdx': __fd_glob_8,
		'adapters/mongoose.mdx': __fd_glob_9,
		'common/decorators.mdx': __fd_glob_10,
		'common/index.mdx': __fd_glob_11,
		'client/admin.mdx': __fd_glob_12,
		'client/index.mdx': __fd_glob_13,
		'client/ui.mdx': __fd_glob_14,
		'core/admin-module.mdx': __fd_glob_15,
		'core/auth-module.mdx': __fd_glob_16,
		'core/content-module.mdx': __fd_glob_17,
		'core/database-module.mdx': __fd_glob_18,
		'core/index.mdx': __fd_glob_19,
		'getting-started/index.mdx': __fd_glob_20,
		'getting-started/installation.mdx': __fd_glob_21,
		'getting-started/quick-start.mdx': __fd_glob_22,
		'plugins/content-builder.mdx': __fd_glob_23,
		'plugins/index.mdx': __fd_glob_24,
		'plugins/seo.mdx': __fd_glob_25,
	},
)
