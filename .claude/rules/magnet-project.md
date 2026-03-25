# Project: Magnet CMS

**Last Updated:** 2026-03-12

## Overview

Bun-based Turbo monorepo — headless CMS framework built on NestJS.

## Technology Stack

- **Runtime:** Bun 1.2.2+, Node.js 18+
- **Framework:** NestJS (backend), React + Vite (admin UI), Next.js + Fumadocs (docs)
- **Database:** Mongoose, Drizzle (Neon/Supabase adapters)
- **Auth:** Passport + JWT
- **Build:** Turborepo, tsup
- **Lint/Format:** Biome
- **Testing:** Playwright (E2E)
- **Git Hooks:** Husky, commitlint (conventional commits), lint-staged
- **Versioning:** Changesets
- **Package Manager:** Bun (workspaces)

## Packages

| Package                                | Path                                 | Description                                         |
| -------------------------------------- | ------------------------------------ | --------------------------------------------------- |
| `@magnet-cms/core`                     | `packages/core`                      | Core NestJS module (17 sub-modules)                 |
| `@magnet-cms/common`                   | `packages/common`                    | Shared types, decorators, utilities                 |
| `@magnet-cms/adapter-db-mongoose`      | `packages/adapters/db-mongoose`      | Mongoose database adapter                           |
| `@magnet-cms/adapter-db-drizzle`       | `packages/adapters/db-drizzle`       | Drizzle database adapter                            |
| `@magnet-cms/adapter-auth-supabase`    | `packages/adapters/auth-supabase`    | Supabase auth strategy                              |
| `@magnet-cms/adapter-auth-clerk`       | `packages/adapters/auth-clerk`       | Clerk auth strategy (RS256/JWKS via @clerk/backend) |
| `@magnet-cms/adapter-storage-supabase` | `packages/adapters/storage-supabase` | Supabase storage adapter                            |
| `@magnet-cms/adapter-storage-s3`       | `packages/adapters/storage-s3`       | AWS S3 storage adapter                              |
| `@magnet-cms/adapter-storage-r2`       | `packages/adapters/storage-r2`       | Cloudflare R2 storage adapter                       |
| `@magnet-cms/email-nodemailer`         | `packages/adapters/email-nodemailer` | Nodemailer email adapter                            |
| `@magnet-cms/email-resend`             | `packages/adapters/email-resend`     | Resend email adapter                                |
| `@magnet-cms/admin`                    | `packages/client/admin`              | React admin UI (Vite)                               |
| `@magnet-cms/ui`                       | `packages/client/ui`                 | Shared UI component library                         |
| `@magnet-cms/plugin-playground`        | `packages/plugins/playground`        | Playground (schema builder) plugin                  |
| `@magnet-cms/plugin-seo`               | `packages/plugins/seo`               | SEO plugin                                          |
| `@magnet-cms/utils`                    | `packages/utils`                     | Utility functions                                   |
| `create-magnet`                        | `packages/create-magnet`             | CLI scaffolding tool                                |

## Apps

| App                        | Path                             | Description                           |
| -------------------------- | -------------------------------- | ------------------------------------- |
| `mongoose-example`         | `apps/examples/mongoose`         | Example NestJS app (Mongoose)         |
| `drizzle-neon-example`     | `apps/examples/drizzle-neon`     | Example NestJS app (Drizzle/Neon)     |
| `drizzle-supabase-example` | `apps/examples/drizzle-supabase` | Example NestJS app (Drizzle/Supabase) |
| `docs`                     | `apps/docs`                      | Fumadocs documentation site           |
| `e2e`                      | `apps/e2e`                       | Playwright E2E tests                  |

## Core Modules

`packages/core/src/modules/`: admin, admin-serve, api-keys, auth, content, database, discovery, document, environment, events, health, history, plugin, rbac, settings, storage, user

## Directory Structure

```
magnet/
├── apps/
│   ├── docs/                    # Fumadocs (Next.js)
│   │   └── content/docs/        # MDX documentation (no i18n subdirs currently)
│   ├── e2e/tests/{api,ui,admin-serve}/ # Playwright E2E tests
│   └── examples/{mongoose,drizzle-neon,drizzle-supabase}/
├── packages/
│   ├── adapters/{mongoose,drizzle,supabase}/
│   ├── client/{admin,ui}/
│   ├── common/                  # Shared types/decorators
│   ├── core/                    # Core NestJS module
│   ├── create-magnet/           # CLI scaffolding
│   ├── plugins/{playground,seo}/
│   ├── tooling/{biome,tsup,typescript}/
│   └── utils/
├── plans/                       # Feature/architecture plans
├── scripts/
└── turbo.json
```

## Commands

| Task              | Command                                  |
| ----------------- | ---------------------------------------- |
| Install           | `bun install`                            |
| Dev (all)         | `bun run dev`                            |
| Dev (admin)       | `bun run dev:admin`                      |
| Dev (docs)        | `bun run dev:docs`                       |
| Build             | `bun run build`                          |
| Lint              | `bun run lint`                           |
| Type check        | `bun run check-types`                    |
| E2E tests         | `bun run test:e2e`                       |
| E2E (API only)    | `bun run test:e2e --project=api`         |
| E2E (UI only)     | `bun run test:e2e --project=ui`          |
| E2E (Admin serve) | `bun run test:e2e --project=admin-serve` |
| Add changeset     | `bun changeset`                          |
| Release           | `bun run build && changeset publish`     |

**IMPORTANT:** Always run `bun run check-types` before committing.
