// @ts-nocheck
import * as __fd_glob_43 from "../content/docs/plugins/vault.mdx?collection=docs"
import * as __fd_glob_42 from "../content/docs/plugins/seo.mdx?collection=docs"
import * as __fd_glob_41 from "../content/docs/plugins/sentry.mdx?collection=docs"
import * as __fd_glob_40 from "../content/docs/plugins/playground.mdx?collection=docs"
import * as __fd_glob_39 from "../content/docs/plugins/index.mdx?collection=docs"
import * as __fd_glob_38 from "../content/docs/migrations/migration-files.mdx?collection=docs"
import * as __fd_glob_37 from "../content/docs/migrations/index.mdx?collection=docs"
import * as __fd_glob_36 from "../content/docs/migrations/configuration.mdx?collection=docs"
import * as __fd_glob_35 from "../content/docs/migrations/cli-commands.mdx?collection=docs"
import * as __fd_glob_34 from "../content/docs/migrations/best-practices.mdx?collection=docs"
import * as __fd_glob_33 from "../content/docs/guides/nextjs-integration.mdx?collection=docs"
import * as __fd_glob_32 from "../content/docs/getting-started/quick-start.mdx?collection=docs"
import * as __fd_glob_31 from "../content/docs/getting-started/installation.mdx?collection=docs"
import * as __fd_glob_30 from "../content/docs/getting-started/index.mdx?collection=docs"
import * as __fd_glob_29 from "../content/docs/core/webhooks-module.mdx?collection=docs"
import * as __fd_glob_28 from "../content/docs/core/rbac-module.mdx?collection=docs"
import * as __fd_glob_27 from "../content/docs/core/notifications-module.mdx?collection=docs"
import * as __fd_glob_26 from "../content/docs/core/index.mdx?collection=docs"
import * as __fd_glob_25 from "../content/docs/core/database-module.mdx?collection=docs"
import * as __fd_glob_24 from "../content/docs/core/content-module.mdx?collection=docs"
import * as __fd_glob_23 from "../content/docs/core/auth-module.mdx?collection=docs"
import * as __fd_glob_22 from "../content/docs/core/api-keys-module.mdx?collection=docs"
import * as __fd_glob_21 from "../content/docs/core/admin-module.mdx?collection=docs"
import * as __fd_glob_20 from "../content/docs/common/index.mdx?collection=docs"
import * as __fd_glob_19 from "../content/docs/common/field-decorators.mdx?collection=docs"
import * as __fd_glob_18 from "../content/docs/common/decorators.mdx?collection=docs"
import * as __fd_glob_17 from "../content/docs/client/ui.mdx?collection=docs"
import * as __fd_glob_16 from "../content/docs/client/index.mdx?collection=docs"
import * as __fd_glob_15 from "../content/docs/client/admin.mdx?collection=docs"
import * as __fd_glob_14 from "../content/docs/admin/i18n.mdx?collection=docs"
import * as __fd_glob_13 from "../content/docs/adapters/supabase.mdx?collection=docs"
import * as __fd_glob_12 from "../content/docs/adapters/mongoose.mdx?collection=docs"
import * as __fd_glob_11 from "../content/docs/adapters/index.mdx?collection=docs"
import * as __fd_glob_10 from "../content/docs/adapters/drizzle.mdx?collection=docs"
import * as __fd_glob_9 from "../content/docs/index.mdx?collection=docs"
import { default as __fd_glob_8 } from "../content/docs/plugins/meta.json?collection=docs"
import { default as __fd_glob_7 } from "../content/docs/migrations/meta.json?collection=docs"
import { default as __fd_glob_6 } from "../content/docs/core/meta.json?collection=docs"
import { default as __fd_glob_5 } from "../content/docs/guides/meta.json?collection=docs"
import { default as __fd_glob_4 } from "../content/docs/getting-started/meta.json?collection=docs"
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

export const docs = await create.docs("docs", "content/docs", {"meta.json": __fd_glob_0, "adapters/meta.json": __fd_glob_1, "client/meta.json": __fd_glob_2, "common/meta.json": __fd_glob_3, "getting-started/meta.json": __fd_glob_4, "guides/meta.json": __fd_glob_5, "core/meta.json": __fd_glob_6, "migrations/meta.json": __fd_glob_7, "plugins/meta.json": __fd_glob_8, }, {"index.mdx": __fd_glob_9, "adapters/drizzle.mdx": __fd_glob_10, "adapters/index.mdx": __fd_glob_11, "adapters/mongoose.mdx": __fd_glob_12, "adapters/supabase.mdx": __fd_glob_13, "admin/i18n.mdx": __fd_glob_14, "client/admin.mdx": __fd_glob_15, "client/index.mdx": __fd_glob_16, "client/ui.mdx": __fd_glob_17, "common/decorators.mdx": __fd_glob_18, "common/field-decorators.mdx": __fd_glob_19, "common/index.mdx": __fd_glob_20, "core/admin-module.mdx": __fd_glob_21, "core/api-keys-module.mdx": __fd_glob_22, "core/auth-module.mdx": __fd_glob_23, "core/content-module.mdx": __fd_glob_24, "core/database-module.mdx": __fd_glob_25, "core/index.mdx": __fd_glob_26, "core/notifications-module.mdx": __fd_glob_27, "core/rbac-module.mdx": __fd_glob_28, "core/webhooks-module.mdx": __fd_glob_29, "getting-started/index.mdx": __fd_glob_30, "getting-started/installation.mdx": __fd_glob_31, "getting-started/quick-start.mdx": __fd_glob_32, "guides/nextjs-integration.mdx": __fd_glob_33, "migrations/best-practices.mdx": __fd_glob_34, "migrations/cli-commands.mdx": __fd_glob_35, "migrations/configuration.mdx": __fd_glob_36, "migrations/index.mdx": __fd_glob_37, "migrations/migration-files.mdx": __fd_glob_38, "plugins/index.mdx": __fd_glob_39, "plugins/playground.mdx": __fd_glob_40, "plugins/sentry.mdx": __fd_glob_41, "plugins/seo.mdx": __fd_glob_42, "plugins/vault.mdx": __fd_glob_43, });