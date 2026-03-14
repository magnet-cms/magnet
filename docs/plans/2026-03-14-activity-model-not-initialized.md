# Activity Model Not Initialized Fix Plan

Created: 2026-03-14
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Bugfix

## Summary
**Symptom:** Activity search endpoint crashes with "Model not initialized. Call an async method first to initialize the model." at GET /activity/search
**Trigger:** Navigating to the Activity page before any activity has been logged (no async method has been called on the model yet)
**Root Cause:** `packages/adapters/mongoose/src/mongoose.model.ts:741` — `query()` is the only method that doesn't call `_ensureModel()` for lazy initialization. It checks `this._model` synchronously and throws if null.

## Investigation
- All other `MongooseModelAdapter` methods (`create`, `find`, `findById`, `findOne`, `findMany`, `update`, `delete`) call `await this._ensureModel()` which handles lazy model initialization via a factory function with retry logic.
- `query()` (line 741) skips this — it checks `this._model` directly and throws if null. This means `query()` can only succeed if another async method was called first.
- `ActivityService.search()` uses `this.activityModel.query()` as its first operation. When the Activity page loads before any activity has been logged (no `create()` called), `_model` is null.
- `HistoryService.getNextVersionNumber()` has the same pattern — calls `query()` before any async method.
- Both `ActivityModule` and `HistoryModule` use a fragile `setTimeout(resolve, 1000)` hack in their model providers, which doesn't help because it gets the model adapter wrapper (with null `_model`) — the lazy init factory still hasn't been called.
- Working modules like `UserModule` use `@InjectModel(User)` and `DatabaseModule.forFeature(User)` properly, avoiding the manual factory pattern.

## Fix Approach
**Files:** `mongoose.model.ts`, `mongoose.query-builder.ts`, `activity.module.ts`, `history.module.ts`
**Strategy:**
1. Fix `MongooseModelAdapter.query()` to support lazy initialization by passing a model promise to `MongooseQueryBuilder` (resolved at `exec()`/`count()` time — preserves the sync chaining API)
2. Simplify `ActivityModule` and `HistoryModule` to use `@InjectModel` like other modules, removing the `setTimeout` hack
**Tests:** E2E test verifying activity search works on first load

## Progress
- [x] Task 1: Fix query() lazy initialization and simplify modules
- [x] Task 2: Verify
**Tasks:** 2 | **Done:** 2

## Tasks
### Task 1: Fix query() lazy initialization and simplify modules
**Objective:** Make `query()` handle lazy model initialization and remove the setTimeout hack from Activity/History modules
**Files:**
- `packages/adapters/mongoose/src/mongoose.model.ts` — change `query()` to pass model promise instead of throwing
- `packages/adapters/mongoose/src/mongoose.query-builder.ts` — accept model promise, resolve in terminal ops (`exec`, `execOne`, `count`, `exists`, `paginate`)
- `packages/core/src/modules/activity/activity.module.ts` — simplify: use `@InjectModel(Activity)` via `DatabaseModule.forFeature(Activity)`, remove `ACTIVITY_MODEL` factory and `setTimeout` hack
- `packages/core/src/modules/history/history.module.ts` — same simplification for History
**TDD:** Write regression test for activity search on fresh model → verify FAILS → implement fix → verify all PASS
**Verify:** `bun run check-types && bun run lint`

### Task 2: Verify
**Objective:** Full suite + quality checks + runtime verification
**Verify:** `bun run check-types && bun run lint` + verify activity search endpoint works
