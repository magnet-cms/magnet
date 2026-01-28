// @ts-nocheck
import * as __fd_glob_30 from "../content/docs/plugins/seo.mdx?collection=docs"
import * as __fd_glob_29 from "../content/docs/plugins/index.mdx?collection=docs"
import * as __fd_glob_28 from "../content/docs/plugins/content-builder.mdx?collection=docs"
import * as __fd_glob_27 from "../content/docs/getting-started/quick-start.mdx?collection=docs"
import * as __fd_glob_26 from "../content/docs/getting-started/installation.mdx?collection=docs"
import * as __fd_glob_25 from "../content/docs/getting-started/index.mdx?collection=docs"
import * as __fd_glob_24 from "../content/docs/guides/nextjs-integration.mdx?collection=docs"
import * as __fd_glob_23 from "../content/docs/core/rbac-module.mdx?collection=docs"
import * as __fd_glob_22 from "../content/docs/core/index.mdx?collection=docs"
import * as __fd_glob_21 from "../content/docs/core/database-module.mdx?collection=docs"
import * as __fd_glob_20 from "../content/docs/core/content-module.mdx?collection=docs"
import * as __fd_glob_19 from "../content/docs/core/auth-module.mdx?collection=docs"
import * as __fd_glob_18 from "../content/docs/core/api-keys-module.mdx?collection=docs"
import * as __fd_glob_17 from "../content/docs/core/admin-module.mdx?collection=docs"
import * as __fd_glob_16 from "../content/docs/common/index.mdx?collection=docs"
import * as __fd_glob_15 from "../content/docs/common/field-decorators.mdx?collection=docs"
import * as __fd_glob_14 from "../content/docs/common/decorators.mdx?collection=docs"
import * as __fd_glob_13 from "../content/docs/client/ui.mdx?collection=docs"
import * as __fd_glob_12 from "../content/docs/client/index.mdx?collection=docs"
import * as __fd_glob_11 from "../content/docs/client/admin.mdx?collection=docs"
import * as __fd_glob_10 from "../content/docs/adapters/mongoose.mdx?collection=docs"
import * as __fd_glob_9 from "../content/docs/adapters/index.mdx?collection=docs"
import * as __fd_glob_8 from "../content/docs/index.mdx?collection=docs"
import { default as __fd_glob_7 } from "../content/docs/plugins/meta.json?collection=docs"
import { default as __fd_glob_6 } from "../content/docs/guides/meta.json?collection=docs"
import { default as __fd_glob_5 } from "../content/docs/getting-started/meta.json?collection=docs"
import { default as __fd_glob_4 } from "../content/docs/core/meta.json?collection=docs"
import { default as __fd_glob_3 } from "../content/docs/common/meta.json?collection=docs"
import { default as __fd_glob_2 } from "../content/docs/client/meta.json?collection=docs"
import { default as __fd_glob_1 } from "../content/docs/adapters/meta.json?collection=docs"
import { default as __fd_glob_0 } from "../content/docs/meta.json?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.docs("docs", "content/docs", {"meta.json": __fd_glob_0, "adapters/meta.json": __fd_glob_1, "client/meta.json": __fd_glob_2, "common/meta.json": __fd_glob_3, "core/meta.json": __fd_glob_4, "getting-started/meta.json": __fd_glob_5, "guides/meta.json": __fd_glob_6, "plugins/meta.json": __fd_glob_7, }, {"index.mdx": __fd_glob_8, "adapters/index.mdx": __fd_glob_9, "adapters/mongoose.mdx": __fd_glob_10, "client/admin.mdx": __fd_glob_11, "client/index.mdx": __fd_glob_12, "client/ui.mdx": __fd_glob_13, "common/decorators.mdx": __fd_glob_14, "common/field-decorators.mdx": __fd_glob_15, "common/index.mdx": __fd_glob_16, "core/admin-module.mdx": __fd_glob_17, "core/api-keys-module.mdx": __fd_glob_18, "core/auth-module.mdx": __fd_glob_19, "core/content-module.mdx": __fd_glob_20, "core/database-module.mdx": __fd_glob_21, "core/index.mdx": __fd_glob_22, "core/rbac-module.mdx": __fd_glob_23, "guides/nextjs-integration.mdx": __fd_glob_24, "getting-started/index.mdx": __fd_glob_25, "getting-started/installation.mdx": __fd_glob_26, "getting-started/quick-start.mdx": __fd_glob_27, "plugins/content-builder.mdx": __fd_glob_28, "plugins/index.mdx": __fd_glob_29, "plugins/seo.mdx": __fd_glob_30, });