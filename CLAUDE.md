# CLAUDE.md - Magnet Project Guidelines

This file contains rules and guidelines for Claude Code when working on the Magnet project.

## Project Overview

Magnet is a Bun-based Turbo monorepo providing a headless CMS framework built on NestJS.

### Key Packages

| Package | Path | Description |
|---------|------|-------------|
| `@magnet/core` | `packages/core` | Core NestJS module with Admin, Auth, Content, Database modules |
| `@magnet/common` | `packages/common` | Shared types, decorators, and utilities |
| `@magnet/adapter-mongoose` | `packages/adapters/mongoose` | Mongoose database adapter |
| `@magnet/admin` | `packages/client/admin` | React admin UI |
| `@magnet/ui` | `packages/client/ui` | Shared UI component library |
| `@magnet/plugin-content-builder` | `packages/plugins/content-builder` | Content builder plugin |
| `@magnet/plugin-seo` | `packages/plugins/seo` | SEO plugin |
| `@magnet/utils` | `packages/utils` | Utility functions |
| `@magnet/docs` | `apps/docs` | Fumadocs documentation site |

### Apps

| App | Path | Description |
|-----|------|-------------|
| `cats-example` | `apps/cats-example` | Example NestJS application |
| `e2e` | `apps/e2e` | Playwright E2E tests |
| `docs` | `apps/docs` | Fumadocs documentation |

---

## Mandatory Rules

### 1. Documentation Requirements

**ALWAYS document new code and scenarios:**

When creating a new feature, module, or significant change:

1. **Update documentation** in `apps/docs/content/docs/en/`
2. Use MDX format with proper frontmatter:
   ```mdx
   ---
   title: Feature Name
   description: Brief description of the feature
   ---
   ```
3. Include code examples with proper TypeScript typing
4. Document all public APIs, decorators, and types
5. Add JSDoc comments to all exported functions, classes, and interfaces
6. Update navigation in `meta.json` files if adding new pages

**Documentation checklist for new features:**
- [ ] MDX documentation file created/updated in `apps/docs/content/docs/en/`
- [ ] Code examples included and tested
- [ ] API reference updated (if applicable)
- [ ] Navigation (`meta.json`) updated to include new pages
- [ ] JSDoc comments added to public APIs

### 2. E2E Testing Requirements

**ALWAYS write E2E tests for new code:**

1. **API endpoints** → Add tests in `apps/e2e/tests/api/`
2. **UI features** → Add tests in `apps/e2e/tests/ui/`
3. **Documentation pages** → Add tests in `apps/e2e/tests/docs/`

**Test file conventions:**
- API tests: `{feature}.spec.ts` in `tests/api/`
- UI tests: `{feature}.spec.ts` in `tests/ui/`
- Docs tests: `{feature}.spec.ts` in `tests/docs/`

**E2E test checklist for new features:**
- [ ] API tests written for new endpoints
- [ ] UI tests written for new user flows
- [ ] Page objects created/updated for new UI components
- [ ] Tests pass locally: `bun run test:e2e`

### 3. Code Style

- Use **Biome** for linting and formatting
- Run `bun run lint` before committing
- Follow existing patterns in the codebase
- Use TypeScript strict mode
- Prefer explicit types over `any`

### 4. Commit Guidelines

- Use conventional commits format: `type(scope): message`
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Reference issues when applicable: `fixes #123`
- Keep commits atomic and focused

---

## Package-Specific Guidelines

### @magnet/core

- All modules should be documented in `apps/docs/content/docs/en/core/`
- Services should have JSDoc comments explaining their purpose
- Controllers should document their endpoints
- When adding a new sub-module, update the core index.mdx

### @magnet/common

- All decorators MUST be documented with usage examples
- Types should include JSDoc descriptions
- Update `apps/docs/content/docs/en/common/` for new exports
- Add validation tests for new decorators

### @magnet/admin

- UI components should have proper TypeScript props
- Document component props and usage in `apps/docs/content/docs/en/client/admin/`
- Test new UI features in `apps/e2e/tests/ui/`

### @magnet/adapter-mongoose

- Database adapters must implement the `DatabaseAdapter` interface
- Document adapter-specific features in `apps/docs/content/docs/en/adapters/`
- Include connection and query examples

### Plugins

- Plugins must follow the plugin architecture
- Document plugin hooks and configuration in `apps/docs/content/docs/en/plugins/`
- Include installation and usage examples

---

## i18n Guidelines

The documentation supports multiple languages:

- **English (default)**: `apps/docs/content/docs/en/`
- **Portuguese (Brazil)**: `apps/docs/content/docs/pt-BR/`

When adding documentation:
1. Always create the English version first
2. Portuguese translations can be added later
3. Update `meta.json` in each language folder

---

## Running the Project

```bash
# Install dependencies
bun install

# Start development
bun run dev:admin    # Starts backend + admin UI (ports 3000, 3001)
bun run dev:docs     # Starts documentation site (port 3002)

# Run tests
bun run test:e2e     # Run all E2E tests
bun run test:e2e --project=api   # Run API tests only
bun run test:e2e --project=ui    # Run UI tests only
bun run test:e2e --project=docs  # Run docs tests only

# Build
bun run build        # Build all packages

# Lint
bun run lint         # Lint all packages
```

---

## File Structure Reference

```
magnet/
├── apps/
│   ├── cats-example/        # Example NestJS app
│   ├── docs/                # Fumadocs documentation
│   │   ├── app/             # Next.js App Router
│   │   ├── content/docs/    # MDX documentation
│   │   │   ├── en/          # English docs
│   │   │   └── pt-BR/       # Portuguese docs
│   │   └── lib/             # Source loader, i18n config
│   └── e2e/                 # Playwright E2E tests
│       └── tests/
│           ├── api/         # API tests
│           ├── ui/          # UI tests
│           └── docs/        # Documentation tests
├── packages/
│   ├── adapters/mongoose/   # Mongoose adapter
│   ├── client/
│   │   ├── admin/           # Admin UI
│   │   └── ui/              # UI components
│   ├── common/              # Shared types/decorators
│   ├── core/                # Core NestJS module
│   ├── plugins/
│   │   ├── content-builder/ # Content builder plugin
│   │   └── seo/             # SEO plugin
│   ├── tooling/             # Shared configs
│   └── utils/               # Utility functions
├── CLAUDE.md                # This file
└── turbo.json               # Turbo configuration
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Install deps | `bun install` |
| Dev (all) | `bun run dev` |
| Dev (admin) | `bun run dev:admin` |
| Dev (docs) | `bun run dev:docs` |
| Build | `bun run build` |
| Lint | `bun run lint` |
| E2E tests | `bun run test:e2e` |
| Type check | `bun run check-types` |
| Add changeset | `bun changeset` |

---

## Publishing Packages

This project uses [Changesets](https://github.com/changesets/changesets) for automated versioning and publishing.

### Adding a Changeset

When making changes that should be released, create a changeset:

```bash
bun changeset
```

This prompts you to:
1. Select which packages changed
2. Choose bump type (major/minor/patch)
3. Write a change summary

### Release Workflow

1. **Develop**: Add changesets as you make changes
2. **Merge to main**: CI creates a "Release Packages" PR automatically
3. **Review PR**: Shows version bumps and changelog updates
4. **Merge PR**: Triggers automatic npm publish

### Changeset Guidelines

- **patch**: Bug fixes, documentation updates
- **minor**: New features, non-breaking changes
- **major**: Breaking changes

### Required GitHub Secrets

- `NPM_TOKEN`: npm automation token for publishing
