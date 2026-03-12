---
name: magnet-new-adapter
description: Guide for adding a new database adapter to the Magnet CMS framework
---

# Adding a New Database Adapter

## Steps

1. **Define typed adapter interface** in `packages/common/src/types/`
   - Use generics to preserve type information
   - All methods must have explicit parameter and return types
   - Reference existing: `packages/common/src/types/database.types.ts`

2. **Create adapter package** at `packages/adapters/<name>/`
   - Follow structure of `packages/adapters/mongoose/` or `packages/adapters/drizzle/`
   - Implement `DatabaseAdapter` interface with full type safety
   - Use type guards for runtime validation
   - Include: decorators (schema, prop, inject), query builder, model, adapter entry

3. **Create factory function** with proper generic constraints
   - Factory should return typed adapter instance
   - See `packages/adapters/mongoose/src/mongoose.adapter.ts` for reference

4. **Register in DatabaseModule**
   - Update `packages/core/src/modules/database/database-adapter.factory.ts`
   - Add adapter detection in `packages/common/src/utils/detect-adapter.util.ts`

5. **Export types** for consumers
   - Use `export type` for type-only exports
   - Document exported types with JSDoc

6. **Add example app** in `apps/examples/<name>/`
   - Follow structure of existing examples
   - Include Docker compose for the database

7. **Write E2E tests** in `apps/e2e/tests/api/`

8. **Document** in `apps/docs/content/docs/adapters/<name>.mdx`
   - Include connection and query examples with proper TypeScript types
   - Update `apps/docs/content/docs/adapters/meta.json`
