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

### 3. Type Safety Requirements - MANDATORY

**TypeScript type safety is NON-NEGOTIABLE. We must ensure TypeScript actually works, not bypass it.**

#### STRICTLY FORBIDDEN:

1. **NEVER use `any` type**
   - All functions, variables, and parameters must have proper types
   - Use `unknown` for truly unknown values, then narrow with type guards
   - Use generic types for flexible but type-safe APIs

2. **NEVER use unsafe type assertions**
   - No `as unknown as TargetType`
   - No `as any`
   - No `(value as any).property`
   - Fix the root cause: ensure types flow correctly through the codebase
   - Use type guards instead: `function isTargetType(value: unknown): value is TargetType`

3. **NEVER bypass TypeScript's type checking**
   - No `// @ts-ignore`
   - No `// @ts-expect-error`
   - No `// @ts-nocheck`
   - Fix the underlying type issue instead

4. **NEVER use loose type definitions**
   - Avoid `Record<string, any>` - use specific types instead
   - Avoid `Record<string, unknown>` unless properly narrowed
   - Prefer specific types: `Record<string, User>` or `{ [key: string]: User }`

#### REQUIRED Practices:

1. **Explicit types for all public APIs**
   - Function parameters must be explicitly typed (no implicit any)
   - Return types must be explicit for exported functions
   - Use `void` explicitly for functions that don't return values

2. **Proper type guards instead of assertions**
   ```typescript
   // ✅ Good: Type guard
   function isUser(value: unknown): value is User {
     return (
       typeof value === 'object' &&
       value !== null &&
       'id' in value &&
       typeof (value as { id: unknown }).id === 'string'
     )
   }
   
   // ❌ Bad: Type assertion
   const user = value as User
   ```

3. **Generics for type-safe abstractions**
   ```typescript
   // ✅ Good: Generic preserves type safety
   function getById<T extends { id: string }>(
     items: T[],
     id: string
   ): T | undefined {
     return items.find(item => item.id === id)
   }
   ```

4. **Runtime validation with type mapping**
   - Use libraries like Zod or implement runtime validators
   - Map validated data to proper TypeScript types
   - Never trust external data without validation

5. **Type-safe error handling**
   - Use typed error classes, not generic `Error`
   - Define specific error types for different error scenarios

#### Type Safety Checklist:

Before submitting any code, verify:
- [ ] No `any` types anywhere in the codebase
- [ ] No `as unknown` or `as any` type assertions
- [ ] No `@ts-ignore` or `@ts-expect-error` comments
- [ ] All function parameters are explicitly typed
- [ ] All exported functions have explicit return types
- [ ] Type guards are used instead of type assertions
- [ ] Generic types are used for reusable type-safe code
- [ ] Runtime validation maps to TypeScript types correctly
- [ ] `bun run check-types` passes with no errors
- [ ] All types flow correctly from inputs to outputs

**Remember**: When types seem difficult, there's usually a better way. Dig deeper and ensure TypeScript actually works, don't bypass it.

### 4. Code Style

- Use **Biome** for linting and formatting
- Run `bun run lint` before committing
- Follow existing patterns in the codebase
- Use TypeScript strict mode (enforced in base config)
- Type safety rules above take precedence over code style preferences

### 5. Commit Guidelines

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
- **All exported types must be properly typed** - no `any`, no unsafe assertions
- Update `apps/docs/content/docs/en/common/` for new exports
- Add validation tests for new decorators
- When adding new types, ensure they work correctly with TypeScript's type system

### @magnet/admin

- UI components should have proper TypeScript props
- Document component props and usage in `apps/docs/content/docs/en/client/admin/`
- Test new UI features in `apps/e2e/tests/ui/`

### Database Adapters (mongoose, drizzle, etc.)

- Database adapters must implement the `DatabaseAdapter` interface with **full type safety**
- **Use generics to preserve type information** through query chains
- Query results must be properly typed based on schema types
- **No `any` types in adapter implementations**
- Document adapter-specific features in `apps/docs/content/docs/en/adapters/`
- Include connection and query examples with proper TypeScript types

### Plugins

- Plugins must follow the plugin architecture with **type-safe interfaces**
- Plugin configuration must be properly typed (no `Record<string, any>`)
- Hook types should be well-defined and preserve type information
- Document plugin hooks and configuration in `apps/docs/content/docs/en/plugins/`
- Include installation and usage examples with proper TypeScript types

---

## Library Development Helpers

When working on library packages (`packages/*`), follow these task-specific guidelines:

### Adding a New Adapter

1. **Define typed adapter interface** in `packages/common/src/types/`
   - Use generics to preserve type information
   - All methods must have explicit parameter and return types
   - No `any` types in the interface definition

2. **Implement the adapter** with full type safety
   - Implement all interface methods with proper types
   - Use type guards for runtime validation
   - Map validated data to TypeScript types correctly

3. **Create factory function** with proper generic constraints
   - Factory should return typed adapter instance
   - Generic parameters should be as specific as possible

4. **Export necessary types** for consumers
   - Export all types that users might need
   - Use `export type` for type-only exports
   - Document exported types with JSDoc

5. **Add example usage** in example apps
   - Examples must be fully type-safe
   - Demonstrate proper type usage
   - Show type inference in action

6. **Document** in `apps/docs/`
   - Include TypeScript examples
   - Show type safety features
   - Document exported types

### Adding a New Decorator

1. **Define metadata types** with proper TypeScript types
   - Metadata interfaces must be well-typed
   - No `Record<string, any>` - use specific property types

2. **Create decorator function** with correct parameter types
   - Parameters must be explicitly typed
   - Return type should preserve decorated class type
   - Use proper generic constraints

3. **Validate at compile time** using TypeScript's type system
   - Leverage TypeScript's type checking
   - Don't rely on runtime checks alone
   - Ensure types are enforced at compile time

4. **Export type helpers** for consumers
   - Export utility types for working with decorator metadata
   - Provide type guards if needed

5. **Document** with JSDoc and examples
   - Show TypeScript type usage
   - Include examples of type inference

### Adding a New Service

1. **Define service interface** if needed (recommended)
   - Interface should be fully typed
   - All methods must have explicit types

2. **Type all dependencies** (no `any` injections)
   - Use NestJS dependency injection with proper types
   - Constructor parameters must be typed

3. **Type all public methods** explicitly
   - Return types must be explicit
   - Parameters must be explicitly typed

4. **Use generics** where appropriate
   - For reusable, type-safe functionality
   - Preserve type information through method chains

5. **Handle errors** with typed error classes
   - Define specific error types
   - No generic `Error` types

### Working with External Libraries

When integrating third-party libraries:

1. **Install type definitions**: `@types/package-name` when available
2. **Create type definitions**: If types don't exist, create `types/package-name.d.ts`
3. **Narrow unknown types**: Use type guards for external data
4. **Type wrappers**: Wrap external APIs with type-safe wrappers when needed
   - Don't expose `any` types from wrappers
   - Ensure wrapper maintains type safety

### Schema and Model Development

1. **Schema classes** should infer their types correctly
   - Use TypeScript's class inference
   - Ensure schema decorators preserve type information

2. **Model instances** should preserve schema types
   - Generic model classes should maintain type information
   - Query methods should return properly typed results

3. **Query results** should be typed based on schema
   - No `any[]` return types
   - Use generics to preserve schema types through queries

4. **Relationships** should maintain type relationships
   - Related entity types should be preserved
   - Type inference should work across relationships

### Common Type Safety Patterns

#### Type-Safe Query Builders
```typescript
// ✅ Good: Type-safe query builder
class QueryBuilder<T extends BaseSchema> {
  where(fn: (entity: T) => boolean): this
  findOne(): Promise<T | undefined>
  findMany(): Promise<T[]>
}

// ❌ Bad: Loses type information
class QueryBuilder {
  where(fn: any): this
  findOne(): Promise<any>
  findMany(): Promise<any[]>
}
```

#### Type-Safe Factories
```typescript
// ✅ Good: Factory preserves types
function createAdapter<T extends BaseSchema>(
  schema: Type<T>
): DatabaseAdapter<T> {
  // Implementation
}

// ❌ Bad: Returns any
function createAdapter(schema: any): any {
  // Implementation
}
```

#### Type-Safe Configuration
```typescript
// ✅ Good: Typed configuration
interface PluginConfig {
  features: string[]
  options: { [key: string]: string }
}

function configurePlugin(config: PluginConfig): void

// ❌ Bad: Any configuration
function configurePlugin(config: any): void
```

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

**⚠️ IMPORTANT**: Always run `bun run check-types` before committing to ensure type safety!

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
