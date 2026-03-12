# Magnet: Coding Conventions

## Type Safety — MANDATORY

**NEVER use `any`, `as any`, `as unknown as T`, `@ts-ignore`, `@ts-expect-error`, or `@ts-nocheck`.**

- Use `unknown` + type guards for unknown values
- Use generics to preserve type information through APIs
- Explicit types on all exported function parameters and return types
- Specific types instead of `Record<string, any>` — use `Record<string, User>` or interfaces
- Verify with `bun run check-types` before committing

## Code Style

- **Biome** for linting and formatting — run `bun run lint`
- TypeScript strict mode (enforced in base tsconfig)
- Follow existing patterns in the codebase

## Commit Guidelines

Conventional commits: `type(scope): message`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Reference issues: `fixes #123`
- Atomic, focused commits

## Documentation Requirements

When creating a new feature, module, or significant change:

1. Update/create MDX docs in `apps/docs/content/docs/`
2. Include frontmatter: `title` and `description`
3. Include TypeScript code examples
4. Add JSDoc to all exported functions, classes, interfaces
5. Update `meta.json` navigation if adding new pages

## E2E Testing Requirements

**ALWAYS write E2E tests for new code:**

| Type | Location |
|------|----------|
| API endpoints | `apps/e2e/tests/api/{feature}.spec.ts` |
| UI features | `apps/e2e/tests/ui/{feature}.spec.ts` |
| Doc pages | `apps/e2e/tests/docs/{feature}.spec.ts` |

Create/update page objects in `apps/e2e/src/page-objects/` for new UI components.

## Package-Specific Rules

### @magnet-cms/core
- Document modules in `apps/docs/content/docs/core/`
- JSDoc on services and controller endpoints
- Update core `index.mdx` when adding sub-modules

### @magnet-cms/common
- Document decorators with usage examples in `apps/docs/content/docs/common/`
- All exported types must have JSDoc descriptions

### @magnet-cms/admin
- Typed React component props
- E2E tests in `apps/e2e/tests/ui/`

### Database Adapters
- Implement `DatabaseAdapter` interface with generics
- Document in `apps/docs/content/docs/adapters/`

### Plugins
- Type-safe plugin config (no `Record<string, any>`)
- Document hooks and config in `apps/docs/content/docs/plugins/`

## Changesets

- `bun changeset` for version bumps
- **patch:** bug fixes, docs | **minor:** new features | **major:** breaking changes
- CI auto-creates "Release Packages" PR on merge to main
