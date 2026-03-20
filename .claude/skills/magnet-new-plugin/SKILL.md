---
name: magnet-new-plugin
description: Guide for creating a new plugin for Magnet CMS (backend + frontend)
---

# Creating a New Plugin

## Backend

1. **Create package** at `packages/plugins/<name>/`
   - Structure: `src/plugin.ts`, `src/backend/<name>.module.ts`, `src/frontend/index.ts`, `src/index.ts`
   - Reference: `packages/plugins/playground/`

2. **Create NestJS module** in `src/backend/<name>.module.ts`
   ```typescript
   @Module({
     controllers: [MyController],
     providers: [MyService],
     exports: [MyService],
   })
   export class MyPluginModule {}
   ```

3. **Define plugin class** in `src/plugin.ts` using `@Plugin` from `@magnet-cms/core`
   ```typescript
   import { Plugin } from '@magnet-cms/core'
   import { MyPluginModule } from './backend/my-plugin.module'

   @Plugin({
     name: 'my-plugin',
     description: 'Description',
     version: '1.0.0',
     module: MyPluginModule,
     frontend: {
       routes: [{ path: 'my-page', componentId: 'MyPage' }],
       sidebar: [{ id: 'my-page', title: 'My Page', url: '/my-page', icon: 'LucideIconName', order: 30 }],
     },
   })
   export class MyPlugin {}
   ```

4. **Export** from `src/index.ts`: `export { MyPlugin } from './plugin'`

5. **Register in example app** — add to `MagnetModule.forRoot({ plugins: [{ plugin: MyPlugin }] })`

## Frontend

6. **Create frontend entry** at `src/frontend/index.ts`
   - Self-registers on `window.__MAGNET_PLUGINS__` when script loads
   - Map `componentId` strings to lazy imports
   ```typescript
   const manifest = { pluginName: 'my-plugin', routes: [...], sidebar: [...] }
   const components = {
     MyPage: () => import('./pages/MyPage'),
   }
   // Self-register
   if (!window.__MAGNET_PLUGINS__) window.__MAGNET_PLUGINS__ = []
   window.__MAGNET_PLUGINS__.push({ manifest, components })
   ```

7. **Create React pages** in `src/frontend/pages/`
   - Each component must be a default export

## Package Setup

8. **Configure `package.json`** with dual exports:
   - `"."` — main plugin export (backend)
   - `"./backend"` — backend module only
   - `"./frontend"` — points to `src/frontend/index.ts` for dev, built bundle for prod

9. **Configure `tsup.config.ts`** — build backend as ESM/CJS, frontend as IIFE/UMD

## Integration

10. **Document** in `apps/docs/content/docs/plugins/<name>.mdx`
11. **Write E2E tests** in `apps/e2e/tests/`
12. **Lifecycle hooks** — optionally implement `PluginLifecycle` interface (`onPluginInit`, `onPluginDestroy`)

## Key Types

- `PluginDecoratorOptions` — `@Plugin` options (name, description, version, module, frontend)
- `PluginFrontendManifest` — routes, sidebar, settings, permissions
- `PluginConfig` — registration in `MagnetModule.forRoot({ plugins: [...] })`
- `PluginRegistrationFn` — frontend self-registration type
- `PluginLifecycle` — optional lifecycle hooks interface
