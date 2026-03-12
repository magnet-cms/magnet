---
name: magnet-new-decorator
description: Guide for adding a new decorator to @magnet-cms/common
---

# Adding a New Decorator

## Steps

1. **Define metadata types** in `packages/common/src/types/`
   - Well-typed interfaces (no `Record<string, any>`)
   - Reference existing: `packages/common/src/types/decorator.types.ts`

2. **Create decorator function** in `packages/common/src/decorators/<name>/`
   - Explicitly typed parameters and return type
   - Use `Reflect.defineMetadata` pattern — see existing decorators in `packages/common/src/decorators/`
   - Use proper generic constraints to preserve decorated class type

3. **Export** from `packages/common/src/decorators/index.ts` and `packages/common/src/index.ts`
   - Export type helpers for consumers
   - Provide type guards if needed

4. **Add adapter support** if the decorator affects schema/model behavior
   - Update Mongoose adapter: `packages/adapters/mongoose/src/decorators/`
   - Update Drizzle adapter: `packages/adapters/drizzle/src/decorators/`

5. **Update discovery** if the decorator needs runtime scanning
   - See `packages/core/src/modules/discovery/` for pattern

6. **Document** in `apps/docs/content/docs/common/decorators.mdx` or new MDX file
   - Include usage examples with TypeScript types
   - Show type inference in action
   - Update `meta.json` if adding new page
