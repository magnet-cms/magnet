---
name: magnet-new-service
description: Guide for adding a new NestJS service/module to @magnet-cms/core
---

# Adding a New Core Service/Module

## Steps

1. **Create module directory** at `packages/core/src/modules/<name>/`
   - Follow existing module structure (e.g., `packages/core/src/modules/auth/`)
   - Files: `<name>.module.ts`, `<name>.service.ts`, `<name>.controller.ts`, `index.ts`

2. **Define service interface** (recommended)
   - All methods with explicit parameter and return types
   - Use generics where appropriate

3. **Implement service** with `@Injectable()`
   - Type all constructor dependencies (NestJS DI)
   - Explicit return types on all public methods
   - Use typed error classes from `@magnet-cms/common` (see `packages/common/src/errors/`)

4. **Create DTOs** in `<name>/dto/`
   - Use `class-validator` decorators for runtime validation
   - Proper TypeScript types on all fields

5. **Create schemas** if persisted, in `<name>/schemas/`
   - Use `@Schema()` and `@Prop()` decorators from common
   - Follow document plugin pattern if needed

6. **Register module** in `packages/core/src/magnet.module.ts`
   - Add to imports array in `MagnetModule.forRoot()`
   - Export from `packages/core/src/index.ts`

7. **Add settings** if configurable
   - Use `@Settings()` decorator — see `packages/core/src/modules/auth/auth.settings.ts`
   - Register in `SettingsModule`

8. **Write E2E tests** in `apps/e2e/tests/api/<name>.spec.ts`

9. **Document** in `apps/docs/content/docs/core/<name>.mdx`
   - Document endpoints, configuration, and usage
   - Update `apps/docs/content/docs/core/meta.json`
