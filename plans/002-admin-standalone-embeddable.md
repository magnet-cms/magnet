# Plan 002: Admin - Standalone & Embeddable Architecture

**Status:** ✅ Completed
**Priority:** High
**Estimated Effort:** 3 weeks
**Depends on:** Plan 000 (Type Safety Remediation)

---

## Summary

Refactor the admin panel architecture to support two deployment modes:
1. **Standalone** - Served as static files by NestJS when `admin: true`
2. **Embeddable** - Integrate into any React app (Next.js, Remix, etc.)

Remove the current proxy-based approach in favor of static file serving.

---

## Current State Analysis

### Current Admin Module (`packages/core/src/modules/admin/`)
- `AdminModule` - Contains AdminController and AdminService
- Does NOT serve the admin UI (that's done via dev proxy)

### Current Admin Client (`packages/client/admin/`)
- Built with Vite as SPA
- **Two build outputs:**
  - `dist/client/` - Standalone SPA
  - `dist/lib/` - Embeddable library
- **Already embeddable** via `MagnetAdmin` component
- Uses adapter pattern for API abstraction
- Supports memory router for embedding

### Current MagnetModuleOptions
```typescript
class MagnetModuleOptions {
  db: DBConfig
  jwt: { secret: string }
  auth?: AuthConfig
  internationalization?: InternationalizationOptions
  playground?: PlaygroundOptions
  storage?: StorageConfig
  plugins?: PluginConfig[]
  // NOTE: No admin configuration exists!
}
```

### Pain Points
1. **No admin config** - Can't enable/disable admin serving
2. **Dev-only proxy** - Works in dev, but production requires separate hosting
3. **No static serving** - Must manually configure nginx/CDN for admin
4. **Hardcoded paths** - API URLs scattered in code

---

## Proposed Solution

### 1. Add Admin Configuration to MagnetModuleOptions

```typescript
interface AdminConfig {
  /** Enable static admin serving (default: false in production) */
  enabled?: boolean
  /** Path to serve admin UI (default: '/admin') */
  path?: string
  /** Custom path to admin dist folder */
  distPath?: string
}

class MagnetModuleOptions {
  // ... existing options

  /**
   * Admin panel configuration
   * - `true` = Enable with defaults
   * - `false` = Disable entirely
   * - `AdminConfig` = Custom configuration
   */
  admin?: boolean | AdminConfig
}
```

### 2. New AdminServeModule for Static Serving

```typescript
// packages/core/src/modules/admin-serve/admin-serve.module.ts

@Module({})
export class AdminServeModule implements NestModule {
  static forRoot(options: AdminConfig): DynamicModule | null {
    if (!options.enabled) {
      return null
    }

    const distPath = resolveAdminDistPath(options.distPath)
    if (!distPath) {
      Logger.warn('Admin dist not found. Run: bun run build in @magnet-cms/admin')
      return null
    }

    // Serve static files + SPA fallback
    return {
      module: AdminServeModule,
      providers: [AdminServeMiddleware],
    }
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AdminServeMiddleware)
      .forRoutes({ path: 'admin', method: RequestMethod.GET })
      .forRoutes({ path: 'admin/*', method: RequestMethod.GET })
  }
}
```

### 3. Static File Resolution Strategy

```typescript
function resolveAdminDistPath(customPath?: string): string | null {
  // Priority order:
  // 1. Custom path from config
  // 2. MAGNET_ADMIN_PATH environment variable
  // 3. node_modules/@magnet-cms/admin/dist
  // 4. Monorepo paths (for development)
}
```

### 4. Embeddable Admin Component (Already Exists)

The `MagnetAdmin` component already supports embedding:

```typescript
// Already works in Next.js:
import { MagnetAdmin, createCookieStorage } from '@magnet-cms/admin'

export default function AdminPage() {
  return (
    <MagnetAdmin
      apiBaseUrl={process.env.NEXT_PUBLIC_API_URL}
      basePath="/admin"
      router="memory"  // Don't touch Next.js router
      tokenStorage={createCookieStorage({
        get: (name) => getCookie(name),
        set: (name, value, options) => setCookie(name, value, options),
        delete: (name) => deleteCookie(name),
      })}
    />
  )
}
```

---

## Implementation Plan

### Phase 1: Configuration Updates

**Modify: `packages/common/src/types/config.types.ts`**

```typescript
export interface AdminConfig {
  /** Enable static admin serving (default: false) */
  enabled?: boolean
  /** Path to serve admin UI (default: '/admin') */
  path?: string
  /** Custom path to admin dist folder */
  distPath?: string
}

export class MagnetModuleOptions {
  // ... existing fields

  /**
   * Admin panel configuration
   * @example
   * // Enable with defaults
   * admin: true
   *
   * // Custom path
   * admin: { enabled: true, path: '/dashboard' }
   *
   * // Disable (for API-only mode)
   * admin: false
   */
  admin?: boolean | AdminConfig
}
```

### Phase 2: Admin Serve Module

**New file: `packages/core/src/modules/admin-serve/admin-serve.module.ts`**

```typescript
import { existsSync, readFileSync } from 'fs'
import { join, resolve, extname } from 'path'
import {
  Module,
  DynamicModule,
  Logger,
  NestMiddleware,
  MiddlewareConsumer,
  NestModule,
  Injectable,
} from '@nestjs/common'
import type { Request, Response, NextFunction } from 'express'
import express from 'express'

export interface AdminServeOptions {
  enabled: boolean
  path: string
  distPath?: string
}

/**
 * Resolves admin dist path from multiple locations
 */
function resolveAdminDistPath(customPath?: string): string | null {
  // 1. Custom path from config
  if (customPath && existsSync(customPath)) {
    return resolve(customPath)
  }

  // 2. Environment variable
  const envPath = process.env.MAGNET_ADMIN_PATH
  if (envPath && existsSync(envPath)) {
    return resolve(envPath)
  }

  // 3. node_modules (traverse up to find it)
  let currentDir = process.cwd()
  while (currentDir !== resolve('/')) {
    const nodeModulesPath = join(
      currentDir,
      'node_modules',
      '@magnet-cms',
      'admin',
      'dist'
    )
    if (existsSync(nodeModulesPath)) {
      return nodeModulesPath
    }
    currentDir = resolve(currentDir, '..')
  }

  // 4. Monorepo paths (development)
  const monorepoPatterns = [
    join(process.cwd(), '..', '..', 'packages', 'client', 'admin', 'dist'),
    join(process.cwd(), '..', '..', '..', 'packages', 'client', 'admin', 'dist'),
  ]
  for (const pattern of monorepoPatterns) {
    if (existsSync(pattern)) {
      return resolve(pattern)
    }
  }

  return null
}

// Module-level state
let resolvedDistPath: string | null = null
let resolvedAdminPath = '/admin'
let cachedIndexHtml: string | null = null
let staticMiddleware: express.RequestHandler | null = null

@Injectable()
class AdminServeMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (!resolvedDistPath || !staticMiddleware) {
      next()
      return
    }

    const adminPrefix = resolvedAdminPath.replace(/\/$/, '')
    const originalUrl = req.url
    req.url = req.url.replace(new RegExp(`^${adminPrefix}`), '') || '/'

    staticMiddleware(req, res, () => {
      req.url = originalUrl
      const urlPath = req.url.replace(new RegExp(`^${adminPrefix}`), '') || '/'

      // File extension = missing static file = 404
      if (extname(urlPath)) {
        res.status(404).send('Not found')
        return
      }

      // SPA route - serve index.html
      if (!cachedIndexHtml) {
        const indexPath = join(resolvedDistPath!, 'index.html')
        if (existsSync(indexPath)) {
          cachedIndexHtml = readFileSync(indexPath, 'utf-8')
        }
      }

      if (cachedIndexHtml) {
        res.type('html').send(cachedIndexHtml)
      } else {
        res.status(404).send('Admin panel not found. Build the admin package first.')
      }
    })
  }
}

@Module({})
export class AdminServeModule implements NestModule {
  private static readonly logger = new Logger(AdminServeModule.name)

  configure(consumer: MiddlewareConsumer): void {
    if (resolvedDistPath) {
      consumer
        .apply(AdminServeMiddleware)
        .forRoutes(
          { path: resolvedAdminPath.replace(/^\//, ''), method: 0 },
          { path: `${resolvedAdminPath.replace(/^\//, '')}/*splat`, method: 0 }
        )
    }
  }

  static forRoot(options: AdminServeOptions): DynamicModule | null {
    if (!options.enabled) {
      this.logger.log('Admin panel serving disabled')
      return null
    }

    resolvedAdminPath = options.path
    resolvedDistPath = resolveAdminDistPath(options.distPath)

    if (!resolvedDistPath) {
      this.logger.warn(
        'Admin dist not found. Admin UI will not be served. ' +
        'Run "bun run build" in @magnet-cms/admin to build it.'
      )
      return { module: AdminServeModule }
    }

    staticMiddleware = express.static(resolvedDistPath, {
      index: false,
      fallthrough: true,
    })

    this.logger.log(`Serving admin at ${options.path} from ${resolvedDistPath}`)

    return {
      module: AdminServeModule,
      providers: [AdminServeMiddleware],
    }
  }
}
```

### Phase 3: Integrate into MagnetModule

**Modify: `packages/core/src/magnet.module.ts`**

```typescript
import { AdminServeModule } from './modules/admin-serve/admin-serve.module'

@Module({})
export class MagnetModule {
  static forRoot(options?: MagnetModuleOptions): DynamicModule {
    const defaultOptions = initOptions(options)

    // Normalize admin config
    const adminConfig = normalizeAdminConfig(defaultOptions.admin)

    const imports = [
      // ... existing imports
    ]

    // Conditionally add AdminServeModule
    if (adminConfig.enabled) {
      const adminModule = AdminServeModule.forRoot(adminConfig)
      if (adminModule) {
        imports.push(adminModule)
      }
    }

    return {
      module: MagnetModule,
      global: true,
      imports,
      // ... rest
    }
  }
}

function normalizeAdminConfig(admin?: boolean | AdminConfig): AdminServeOptions {
  if (admin === true) {
    return { enabled: true, path: '/admin' }
  }
  if (admin === false || admin === undefined) {
    return { enabled: false, path: '/admin' }
  }
  return {
    enabled: admin.enabled ?? true,
    path: admin.path ?? '/admin',
    distPath: admin.distPath,
  }
}
```

### Phase 4: Admin Client Cleanup

**Remove hardcoded URLs:**

1. **`packages/client/admin/src/pages/ContentManager/Item/Viewer/API.tsx`**
   - Line 66: Replace `http://localhost:3000` with dynamic value from adapter

2. **`packages/client/admin/src/lib/api.ts`**
   - Remove or deprecate unused `API_URL` export

**Improve embeddability:**

3. **Export memory router helper:**
```typescript
// packages/client/admin/src/index.ts
export { MagnetAdmin } from './MagnetAdmin'
export { createMemoryStorage } from './core/storage/memoryStorage'
export { createCookieStorage } from './core/storage/cookieStorage'
export { createLocalStorage } from './core/storage/localStorage'
export type { MagnetAdminProps } from './MagnetAdmin'
// ... existing exports
```

### Phase 5: Documentation & Examples

**Create Next.js integration example:**

```typescript
// examples/nextjs-admin/app/admin/[[...slug]]/page.tsx
'use client'

import { MagnetAdmin, createCookieStorage } from '@magnet-cms/admin'
import { cookies } from 'next/headers'

export default function AdminPage() {
  return (
    <MagnetAdmin
      apiBaseUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}
      basePath="/admin"
      router="memory"
      tokenStorage={createCookieStorage({
        get: (name) => document.cookie.match(`${name}=([^;]*)`)?.[1] || null,
        set: (name, value, opts) => {
          document.cookie = `${name}=${value}; path=/; max-age=${opts?.maxAge || 86400}`
        },
        delete: (name) => {
          document.cookie = `${name}=; path=/; max-age=0`
        },
      })}
    />
  )
}
```

---

## File Changes Summary

### New Files
| Path | Description |
|------|-------------|
| `packages/core/src/modules/admin-serve/admin-serve.module.ts` | Static file serving module |
| `packages/core/src/modules/admin-serve/index.ts` | Module exports |
| `apps/docs/content/docs/en/guides/nextjs-integration.mdx` | Next.js integration guide |
| `apps/docs/content/docs/en/guides/remix-integration.mdx` | Remix integration guide |

### Modified Files
| Path | Changes |
|------|---------|
| `packages/common/src/types/config.types.ts` | Add `AdminConfig` interface and `admin` option |
| `packages/core/src/magnet.module.ts` | Integrate `AdminServeModule` conditionally |
| `packages/core/src/utils/init-options.util.ts` | Add admin config defaults |
| `packages/client/admin/src/pages/ContentManager/Item/Viewer/API.tsx` | Fix hardcoded URL |
| `packages/client/admin/src/lib/api.ts` | Remove/deprecate unused export |
| `packages/client/admin/src/index.ts` | Export storage helpers |

---

## Usage Examples

### 1. Enable Admin (Default Path)
```typescript
MagnetModule.forRoot({
  db: { ... },
  jwt: { secret: '...' },
  admin: true,  // Serves at /admin
})
```

### 2. Custom Admin Path
```typescript
MagnetModule.forRoot({
  db: { ... },
  jwt: { secret: '...' },
  admin: {
    enabled: true,
    path: '/dashboard',
  },
})
```

### 3. API-Only Mode (No Admin)
```typescript
MagnetModule.forRoot({
  db: { ... },
  jwt: { secret: '...' },
  admin: false,  // or just omit
})
```

### 4. Embed in Next.js
```typescript
// app/admin/[[...slug]]/page.tsx
import { MagnetAdmin, createCookieStorage } from '@magnet-cms/admin'

export default function AdminPage() {
  return (
    <MagnetAdmin
      apiBaseUrl={process.env.NEXT_PUBLIC_API_URL}
      basePath="/admin"
      router="memory"
      tokenStorage={createCookieStorage({ ... })}
    />
  )
}
```

### 5. Embed in Remix
```typescript
// app/routes/admin.$.tsx
import { MagnetAdmin } from '@magnet-cms/admin'
import { useLoaderData } from '@remix-run/react'

export default function AdminRoute() {
  const { apiUrl } = useLoaderData<typeof loader>()

  return (
    <MagnetAdmin
      apiBaseUrl={apiUrl}
      basePath="/admin"
      router="memory"
    />
  )
}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Deployment Options                          │
├─────────────────────────────┬───────────────────────────────────┤
│     Option A: Standalone    │     Option B: Embedded            │
├─────────────────────────────┼───────────────────────────────────┤
│                             │                                   │
│  ┌───────────────────────┐  │  ┌─────────────────────────────┐  │
│  │    NestJS Backend     │  │  │   Next.js / Remix / etc.    │  │
│  │                       │  │  │                             │  │
│  │  ┌─────────────────┐  │  │  │  ┌───────────────────────┐  │  │
│  │  │ AdminServeModule│  │  │  │  │   <MagnetAdmin />     │  │  │
│  │  │ (static files)  │  │  │  │  │   (React component)   │  │  │
│  │  └────────┬────────┘  │  │  │  └───────────┬───────────┘  │  │
│  │           │           │  │  │              │              │  │
│  │  ┌────────▼────────┐  │  │  │  ┌───────────▼───────────┐  │  │
│  │  │   /admin/*      │  │  │  │  │   Memory Router       │  │  │
│  │  │   (SPA routes)  │  │  │  │  │   (no URL changes)    │  │  │
│  │  └─────────────────┘  │  │  │  └───────────────────────┘  │  │
│  │                       │  │  │                             │  │
│  │  ┌─────────────────┐  │  │  │                             │  │
│  │  │   /api/*        │  │  │  │                             │  │
│  │  │   (REST API)    │◄─┼──┼──┼─────── API Calls ───────────┤  │
│  │  └─────────────────┘  │  │  │                             │  │
│  │                       │  │  │                             │  │
│  └───────────────────────┘  │  └─────────────────────────────┘  │
│                             │                                   │
│  Browser loads static       │  Parent app controls routing      │
│  files from NestJS          │  Admin uses memory router         │
│                             │                                   │
└─────────────────────────────┴───────────────────────────────────┘
```

---

## Testing Strategy

### Unit Tests
- Test `resolveAdminDistPath` with various file system states
- Test `normalizeAdminConfig` with all input variations
- Test middleware SPA fallback logic

### E2E Tests
```typescript
// apps/e2e/tests/admin-serve/static-serving.spec.ts
test('serves admin at configured path', async ({ request }) => {
  const response = await request.get('/admin')
  expect(response.ok()).toBeTruthy()
  expect(response.headers()['content-type']).toContain('text/html')
})

test('serves static assets', async ({ request }) => {
  const response = await request.get('/admin/assets/index.js')
  expect(response.ok()).toBeTruthy()
})

test('handles SPA routes', async ({ request }) => {
  const response = await request.get('/admin/content/posts')
  expect(response.ok()).toBeTruthy()
  expect(await response.text()).toContain('<!DOCTYPE html>')
})
```

### Integration Tests
- Test Next.js integration with memory router
- Test cookie storage in SSR context
- Test API connectivity from embedded admin

---

## Success Criteria

1. `admin: true` serves static admin files from NestJS
2. `admin: false` or omitted = no admin serving
3. Custom path works (`admin: { path: '/dashboard' }`)
4. Next.js embedding works with memory router
5. Remix embedding works
6. All existing admin functionality preserved
7. Documentation complete with examples
