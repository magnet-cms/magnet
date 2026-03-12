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
- **Versioning:** Changesets
- **Package Manager:** Bun (workspaces)

## Packages

| Package | Path | Description |
|---------|------|-------------|
| `@magnet-cms/core` | `packages/core` | Core NestJS module (17 sub-modules) |
| `@magnet-cms/common` | `packages/common` | Shared types, decorators, utilities |
| `@magnet-cms/adapter-mongoose` | `packages/adapters/mongoose` | Mongoose database adapter |
| `@magnet-cms/adapter-drizzle` | `packages/adapters/drizzle` | Drizzle database adapter |
| `@magnet-cms/adapter-supabase` | `packages/adapters/supabase` | Supabase auth & storage adapter |
| `@magnet-cms/admin` | `packages/client/admin` | React admin UI (Vite) |
| `@magnet-cms/ui` | `packages/client/ui` | Shared UI component library |
| `@magnet-cms/plugin-content-builder` | `packages/plugins/content-builder` | Content builder plugin |
| `@magnet-cms/plugin-seo` | `packages/plugins/seo` | SEO plugin |
| `@magnet-cms/utils` | `packages/utils` | Utility functions |
| `create-magnet` | `packages/create-magnet` | CLI scaffolding tool |

## Apps

| App | Path | Description |
|-----|------|-------------|
| `mongoose-example` | `apps/examples/mongoose` | Example NestJS app (Mongoose) |
| `drizzle-neon-example` | `apps/examples/drizzle-neon` | Example NestJS app (Drizzle/Neon) |
| `drizzle-supabase-example` | `apps/examples/drizzle-supabase` | Example NestJS app (Drizzle/Supabase) |
| `docs` | `apps/docs` | Fumadocs documentation site |
| `e2e` | `apps/e2e` | Playwright E2E tests |

## Core Modules

`packages/core/src/modules/`: admin, admin-serve, api-keys, auth, content, database, discovery, document, environment, events, health, history, plugin, rbac, settings, storage, user

## Directory Structure

```
magnet/
├── apps/
│   ├── docs/                    # Fumadocs (Next.js)
│   │   └── content/docs/        # MDX documentation (no i18n subdirs currently)
│   ├── e2e/tests/{api,ui,docs}/ # Playwright E2E tests
│   └── examples/{mongoose,drizzle-neon,drizzle-supabase}/
├── packages/
│   ├── adapters/{mongoose,drizzle,supabase}/
│   ├── client/{admin,ui}/
│   ├── common/                  # Shared types/decorators
│   ├── core/                    # Core NestJS module
│   ├── create-magnet/           # CLI scaffolding
│   ├── plugins/{content-builder,seo}/
│   ├── tooling/{biome,tsup,typescript}/
│   └── utils/
├── plans/                       # Feature/architecture plans
├── scripts/
└── turbo.json
```

## Commands

| Task | Command |
|------|---------|
| Install | `bun install` |
| Dev (all) | `bun run dev` |
| Dev (admin) | `bun run dev:admin` |
| Dev (docs) | `bun run dev:docs` |
| Build | `bun run build` |
| Lint | `bun run lint` |
| Type check | `bun run check-types` |
| E2E tests | `bun run test:e2e` |
| E2E (API only) | `bun run test:e2e --project=api` |
| E2E (UI only) | `bun run test:e2e --project=ui` |
| Add changeset | `bun changeset` |
| Release | `bun run build && changeset publish` |

**IMPORTANT:** Always run `bun run check-types` before committing.
