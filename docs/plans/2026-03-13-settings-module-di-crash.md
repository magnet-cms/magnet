# SettingsModule DI Crash Fix Plan

Created: 2026-03-13
Status: COMPLETE
Approved: Yes
Iterations: 0
Worktree: No
Type: Bugfix

## Summary
**Symptom:** Production crash on `bun start:prod` — `UnknownDependenciesException: MAGNET_MODEL_SETTING not available in SettingsModule context`
**Trigger:** Running production build of mongoose example app (`cross-env NODE_ENV=production node dist/main.js`)
**Root Cause:** Commit `1494204` wrapped `DatabaseModule.forFeature(Setting)` with `forwardRef()` in SettingsModule's `@Module()` decorator. NestJS `forwardRef` is designed for circular **class** references, NOT DynamicModule objects — the DynamicModule's providers (including `MAGNET_MODEL_SETTING`) are never registered in the module scope.

## Investigation

**Error chain:**
1. Commit `8c87a94` added `ActivityModule` to `magnet.module.ts`, changing the CJS bundle order
2. `SettingsModule`'s `@Module()` decorator evaluates `DatabaseModule.forFeature(Setting)` at class-decoration time
3. In the CJS bundle, `SettingsModule` was now decorated BEFORE `DatabaseModule` was defined → `TypeError: Cannot read properties of undefined (reading 'forFeature')`
4. Commit `1494204` "fixed" this with `forwardRef(() => DatabaseModule.forFeature(Setting))` — this delayed evaluation and avoided the CJS crash
5. But `forwardRef` wrapping a DynamicModule breaks NestJS DI — the providers from `DatabaseModule.forFeature(Setting)` are never registered → `MAGNET_MODEL_SETTING` not found
6. Same `forwardRef` pattern was applied to `UserModule` — same DI breakage for `MAGNET_MODEL_USER` (masked by SettingsModule crashing first)

**Working pattern comparison:**
- `ActivityModule` and `HistoryModule` also use `forwardRef(() => DatabaseModule.forFeature(X))` BUT work around the DI issue by using `ModuleRef.get(token, { strict: false })` with a 1-second delay — a hacky global lookup bypass
- `AuthModule` uses `@Module({})` empty decorator + `forRoot()` for all imports — no CJS issue because `forRoot()` runs at runtime when all modules are defined
- `SettingsModule` already has a `forRoot()` method with `global: true` that properly imports `DatabaseModule` and `DatabaseModule.forFeature(Setting)` — but it's not being used by `MagnetModule`

**Key insight:** `MagnetModule.forRoot()` imports `SettingsModule` as a bare class (line 83), which triggers the `@Module()` decorator metadata. Switching to `SettingsModule.forRoot()` moves the DatabaseModule references to runtime execution, avoiding the CJS ordering problem entirely.

## Fix Approach
**Files:**
- `packages/core/src/modules/settings/settings.module.ts` — empty `@Module({})`, add controller to `forRoot()`
- `packages/core/src/modules/user/user.module.ts` — revert `forwardRef`, restore direct `DatabaseModule.forFeature(User)`
- `packages/core/src/magnet.module.ts` — use `SettingsModule.forRoot()` instead of bare `SettingsModule`

**Strategy:**
1. Make `SettingsModule`'s `@Module()` decorator empty — no DatabaseModule references at decoration time, avoiding the CJS crash
2. Add `controllers: [SettingsController]` to `SettingsModule.forRoot()` so the controller is registered (currently only in `@Module()`)
3. `MagnetModule.forRoot()` uses `SettingsModule.forRoot()` instead of bare `SettingsModule` — `forRoot()` runs at runtime when DatabaseModule is defined, and it's `global: true` so SettingsService is available everywhere
4. Revert UserModule's `forwardRef` — it wasn't causing the CJS crash (UserModule is defined after DatabaseModule in the bundle), but the `forwardRef` would break its DI

**Tests:** Rebuild core package, verify `bun start:prod` works for mongoose example app. Run `bun run check-types`.

## Runtime Environment
- **Start command:** `cd apps/examples/mongoose && bun start:prod`
- **Build:** `cd packages/core && bun run build`

## Progress
- [x] Task 1: Fix SettingsModule, UserModule, and MagnetModule
- [x] Task 2: Verify production startup
**Tasks:** 2 | **Done:** 2

## Tasks

### Task 1: Fix module wiring

**Objective:** Resolve the DI crash by making SettingsModule's @Module({}) empty, using forRoot() in MagnetModule, and reverting UserModule's forwardRef.

**Files:**
- Modify: `packages/core/src/modules/settings/settings.module.ts`
- Modify: `packages/core/src/modules/user/user.module.ts`
- Modify: `packages/core/src/magnet.module.ts`

**TDD:** Write regression test → verify FAILS → implement fix → verify all PASS

**Verify:**
- `cd /home/gjsoa/code/magnet && bun run check-types`
- `cd /home/gjsoa/code/magnet/packages/core && bun run build`

### Task 2: Verify production startup

**Objective:** Confirm `bun start:prod` works for mongoose example app with no errors.

**Verify:**
- `cd /home/gjsoa/code/magnet/apps/examples/mongoose && bun run build && bun start:prod` (should start without DI errors)
