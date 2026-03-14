# Media Library Enhancements Implementation Plan

Created: 2026-03-14
Status: COMPLETE
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Wire up media library folder creation, file drawer actions (move location, create subfolder, uploaded-by name), document thumbnails with file-type icons, activity auditing for media operations, and expanded file preview (image viewer / embedded PDF reader).

**Architecture:** Backend adds a `MediaFolder` schema for persistent folders, emits media events for activity auditing, and denormalizes uploader name at upload time. Frontend wires existing UI stubs to new/existing APIs and adds file-type icons, folder selection for move, and an expanded preview mode with embedded PDF viewer.

**Tech Stack:** NestJS (backend), React + Radix UI (frontend), existing event system, existing activity module.

## Scope

### In Scope
- Folder CRUD: create, list (with item counts), delete empty folders
- Subfolder support via path nesting (e.g. `parent/child`)
- Media event emission (`media.uploaded`, `media.deleted`, `media.folder_created`, `media.folder_deleted`)
- Activity logging handlers for all media events
- Denormalized `createdByName` on Media records at upload time
- File-type icons for documents in asset grid (PDF, DOC, XLS, etc.)
- PDF thumbnails in grid via file-type icon (server-rendered PDF preview deferred)
- Drawer: wire Move button (folder selection), Create Subfolder, fix Uploaded By display
- Drawer: wire Maximize2 button for expanded preview — image viewer + embedded browser PDF viewer via iframe
- HTTP adapter + React hooks for new folder operations
- E2E tests for API and UI

### Out of Scope
- Server-side PDF thumbnail generation (deferred — using icons for now)
- Cross-storage-provider file moves (within same provider only)
- Crop functionality (existing Crop button — separate feature)
- Video preview/playback
- Folder drag-and-drop reordering
- Bulk move operations

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - Event emission: `packages/core/src/modules/content/content.service.ts:38-50` — uses `getEventContext()` + `this.eventService.emit()`
  - Activity handlers: `packages/core/src/modules/activity/activity.service.ts:96-306` — `@OnEvent('event.name', { async: true })` pattern
  - Schema definition: `packages/core/src/modules/storage/schemas/media.schema.ts` — uses `@Schema`, `@Field.*` decorators from `@magnet-cms/common`
  - Media hooks: `packages/client/admin/src/hooks/useMedia.ts` — TanStack Query hooks wrapping adapter calls
  - HTTP adapter: `packages/client/admin/src/core/adapters/http-adapter.ts:604-758` — media section of the adapter
  - Adapter type interface: `packages/client/admin/src/core/adapters/types.ts:402-421` — `MagnetApiAdapter.media`

- **Conventions:**
  - Backend schemas use `@Schema({ versioning: false, i18n: false, visible: false })` for internal entities
  - Events are defined in `packages/common/src/types/events.types.ts` — media events already exist (`media.uploaded`, `media.deleted`, `media.folder_created`, `media.folder_deleted`)
  - Frontend components in `packages/client/admin/src/features/media-library/components/`
  - UI components from `@magnet-cms/ui` (Sheet, Button, Input, etc.)

- **Key files:**
  - `packages/core/src/modules/storage/storage.service.ts` — StorageService (upload, delete, list, update, getFolders)
  - `packages/core/src/modules/storage/storage.controller.ts` — StorageController (REST endpoints)
  - `packages/core/src/modules/storage/storage.module.ts` — Module setup with `forRoot()`
  - `packages/core/src/modules/storage/schemas/media.schema.ts` — Media schema
  - `packages/core/src/modules/activity/activity.service.ts` — ActivityService with event handlers
  - `packages/core/src/modules/events/event.service.ts` — EventService (emit, on, off)
  - `packages/core/src/modules/events/event-context.interceptor.ts` — getEventContext()
  - `packages/core/src/modules/user/user.service.ts` — UserService (findOneById)
  - `packages/client/admin/src/features/media-library/components/MediaLibraryPage.tsx` — Main page
  - `packages/client/admin/src/features/media-library/components/MediaViewDrawer.tsx` — File details drawer
  - `packages/client/admin/src/features/media-library/components/AssetCard.tsx` — Grid card component
  - `packages/client/admin/src/hooks/useMedia.ts` — Media React hooks
  - `packages/client/admin/src/core/adapters/types.ts` — Adapter type definitions

- **Gotchas:**
  - `StorageModule` uses `forRoot()` pattern — imports `DatabaseModule.forFeature()` and `SettingsModule.forFeature()` inside it
  - The `EventService` is global (imported via `EventsModule`); to use it, inject it into `StorageService`
  - The `UserService` is in `UserModule` — may need to import `UserModule` in `StorageModule` or use `ModuleRef` for lazy resolution
  - The existing `getFolders()` method derives folders from media items — the new dedicated Folder model must be merged with these
  - `MediaViewDrawer` uses a local `Asset` interface separate from `MediaItem` — transformations happen in `MediaLibraryPage.transformMediaToAsset()`
  - Media file URLs use pattern `${baseUrl}/media/file/${id}` — for PDF embedding, ensure this URL is accessible directly

- **Domain context:**
  - Folders are currently virtual (just `folder` string field on Media). The new `MediaFolder` schema makes them first-class entities.
  - The `createdBy` field on Media stores a user ID string (not populated). Adding `createdByName` denormalizes the user's display name at upload time.
  - The event system uses `@OnEvent` decorators that auto-register handlers. Events are already defined in `EventName` union type for media operations.

## Runtime Environment
- **Start command:** `bun run dev` (monorepo dev), `bun start:prod` in `apps/examples/mongoose`
- **Port:** 3000 (API), 5173 (admin UI dev)
- **Health check:** `GET /health`

## Assumptions
- The JWT payload includes the user ID, which is available via `req.user.id` in controllers — supported by `event-context.interceptor.ts:84`. Task 2 depends on this.
- The `UserService.findOneById()` returns user objects with a `name` field — supported by `user.schema.ts:23`. Task 2 depends on this.
- The `EventService` is globally available for injection since `EventsModule` is global — supported by `events.module.ts`. Tasks 2-3 depend on this.
- Empty folders should persist even with no files in them — user decision. Task 1 depends on this.
- `media.uploaded` / `media.deleted` / `media.folder_created` / `media.folder_deleted` event types already exist in `EventName` — supported by `events.types.ts:49-53`. Tasks 2-3 depend on this.
- Browser's native PDF viewer works for embedded PDF display — no additional library needed. Task 7 depends on this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| UserModule circular dependency when importing into StorageModule | Medium | Medium | Use `ModuleRef.get()` for lazy UserService resolution (already used for MediaModel in `storage.service.ts:41-44`) |
| Browser PDF embed may not work in all browsers/configs | Low | Medium | Fall back to download link when iframe fails to load |
| Denormalized `createdByName` goes stale if user renames | Low | Low | Acceptable trade-off per user decision; can add a migration/sync script later |
| Folder deletion with existing files | Medium | Medium | Only allow deleting empty folders; show error if files exist |
| Cross-origin iframe blocked by CSP in dev (admin on :5173, API on :3000) | Medium | Medium | Proxy PDF requests through admin dev server, or add `X-Frame-Options: SAMEORIGIN` and CORS headers to media file endpoint; test PDF embed in both dev and prod |
| Existing media records have no `createdByName` | High | Low | Accept that older uploads show "Unknown"; the `GET /media/:id` response will resolve the name on-the-fly from UserService when `createdByName` is absent (one-time lazy backfill) |

## Goal Verification

### Truths
1. Creating a folder via the UI persists it and it appears in the folder list on refresh
2. Document files (PDF, DOC, etc.) show file-type icons instead of plain "Document" text in the grid
3. The "Move" button in the file drawer allows selecting a target folder and moves the file
4. The "Create new subfolder" button in the drawer creates a subfolder under the current location
5. "Uploaded By" in the drawer shows the actual user name instead of "Unknown"
6. Media operations (upload, delete, folder create/delete) appear in the Activity log
7. Clicking the expand button in the drawer shows a full preview — images in a viewer, PDFs in an embedded viewer

### Artifacts
- `packages/core/src/modules/storage/schemas/media-folder.schema.ts` — Folder schema
- `packages/core/src/modules/storage/storage.controller.ts` — Updated with folder endpoints
- `packages/core/src/modules/storage/storage.service.ts` — Updated with event emission + folder CRUD
- `packages/core/src/modules/activity/activity.service.ts` — Updated with media event handlers
- `packages/client/admin/src/features/media-library/components/MediaViewDrawer.tsx` — Updated with wired buttons + expanded preview
- `packages/client/admin/src/features/media-library/components/AssetCard.tsx` — Updated with file-type icons
- `packages/client/admin/src/hooks/useMedia.ts` — Updated with folder hooks
- `apps/e2e/tests/api/media-library.spec.ts` — API E2E tests
- `apps/e2e/tests/ui/media-library.spec.ts` — UI E2E tests

## Progress Tracking
- [x] Task 1: Backend — MediaFolder Schema and Folder CRUD API
- [x] Task 2: Backend — Event Emission and Uploader Name Denormalization
- [x] Task 3: Backend — Activity Logging for Media Events
- [x] Task 4: Frontend — HTTP Adapter, Hooks, and Folder Creation Wiring
- [x] Task 5: Frontend — Document Thumbnails with File-Type Icons
- [x] Task 6: Frontend — Wire Drawer Buttons (Move, Subfolder, Uploaded By)
- [x] Task 7: Frontend — Expanded File Preview (Image Viewer + PDF Embed)
- [x] Task 8: E2E Tests

**Total Tasks:** 8 | **Completed:** 8 | **Remaining:** 0

## Implementation Tasks

### Task 1: Backend — MediaFolder Schema and Folder CRUD API

**Objective:** Create a `MediaFolder` schema for persistent folder storage and add CRUD endpoints for folder management, including subfolder support.

**Dependencies:** None

**Files:**
- Create: `packages/core/src/modules/storage/schemas/media-folder.schema.ts`
- Modify: `packages/core/src/modules/storage/storage.service.ts`
- Modify: `packages/core/src/modules/storage/storage.controller.ts`
- Modify: `packages/core/src/modules/storage/storage.module.ts`

**Key Decisions / Notes:**
- `MediaFolder` schema: `name` (string, required), `path` (string, required, unique — e.g. `"photos"`, `"photos/vacation"`), `parentPath` (string, optional — parent folder path), `createdBy` (string, optional), `createdByName` (string, optional), `createdAt` (Date)
- Use `@Schema({ versioning: false, i18n: false, visible: false })` like other internal entities
- `path` field is the canonical unique identifier for folders (not an auto-generated ID)
- For subfolders: `path = parentPath ? `${parentPath}/${name}` : name`
- `StorageService` gets new methods: `createFolder(name, parentPath?, createdBy?, createdByName?)`, `deleteFolder(path)`, `getFoldersWithCounts()` (returns folder objects with item counts)
- Update existing `getFolders()` to merge explicit MediaFolder records with folder strings from media items
- Add endpoints: `POST /media/folders` (create), `DELETE /media/folders/:path` (delete), update `GET /media/meta/folders` to return enriched folder objects
- Register `MediaFolder` in `StorageModule.forRoot()` via `DatabaseModule.forFeature(MediaFolder)`
- `deleteFolder` should reject if folder has files in it (query media by folder path)

**Definition of Done:**
- [ ] `POST /media/folders` creates a folder and returns the folder object
- [ ] `GET /media/meta/folders` returns folder objects with `{ name, path, itemCount }` (merged from MediaFolder records + media items)
- [ ] `DELETE /media/folders/:path` deletes an empty folder (returns 400 if folder has files)
- [ ] Subfolder creation works: `POST /media/folders { name: "vacation", parentPath: "photos" }` creates path `photos/vacation`
- [ ] All tests pass
- [ ] No diagnostics errors

**Verify:**
- `bun run check-types`

---

### Task 2: Backend — Event Emission and Uploader Name Denormalization

**Objective:** Inject `EventService` into `StorageService` to emit media events, and add `createdByName` field to Media schema populated at upload time.

**Dependencies:** Task 1

**Files:**
- Modify: `packages/core/src/modules/storage/schemas/media.schema.ts`
- Modify: `packages/core/src/modules/storage/storage.service.ts`
- Modify: `packages/core/src/modules/storage/storage.controller.ts`
- Modify: `packages/core/src/modules/storage/storage.module.ts`

**Key Decisions / Notes:**
- Add `createdByName?: string` field to `Media` schema with `@Field.Text()`
- Inject `EventService` into `StorageService` constructor
- Add `emitEvent()` helper method following the pattern from `content.service.ts:38-50`
- Emit events after each operation:
  - `upload()` → emit `media.uploaded` with `{ fileId, filename, mimeType, size, folder }`
  - `delete()` → emit `media.deleted` with same payload
  - `createFolder()` → emit `media.folder_created` with `{ folderId, folderName, parentFolder }`
  - `deleteFolder()` → emit `media.folder_deleted` with same payload
- For uploader name: In `StorageController.upload()` and `uploadMultiple()`, resolve user name from `UserService.findOneById(userId)` and pass `createdByName` through to `StorageService.upload()`
- Use `ModuleRef.get(UserService, { strict: false })` for lazy resolution to avoid circular dependency
- Update `upload()` and `uploadMany()` signatures to accept `createdByName` option

**Definition of Done:**
- [ ] `Media` schema has `createdByName` field
- [ ] Upload endpoints store the uploader's display name alongside the ID
- [ ] `media.uploaded` event is emitted after file upload
- [ ] `media.deleted` event is emitted after file deletion
- [ ] `media.folder_created` event is emitted after folder creation
- [ ] `media.folder_deleted` event is emitted after folder deletion
- [ ] For existing media without `createdByName`, the `GET /media/:id` and `GET /media` responses resolve the display name on-the-fly from UserService when `createdByName` is absent (lazy backfill)
- [ ] All tests pass
- [ ] No diagnostics errors

**Verify:**
- `bun run check-types`

---

### Task 3: Backend — Activity Logging for Media Events

**Objective:** Add `@OnEvent` handlers in `ActivityService` for all four media events so they appear in the activity log.

**Dependencies:** Task 2

**Files:**
- Modify: `packages/core/src/modules/activity/activity.service.ts`

**Key Decisions / Notes:**
- Follow the existing handler pattern (e.g., `onContentCreated` at line 96-107)
- Add four handlers:
  - `@OnEvent('media.uploaded', { async: true })` → `onMediaUploaded(payload: EventPayload<'media.uploaded'>)`
  - `@OnEvent('media.deleted', { async: true })` → `onMediaDeleted(payload: EventPayload<'media.deleted'>)`
  - `@OnEvent('media.folder_created', { async: true })` → `onMediaFolderCreated(payload: EventPayload<'media.folder_created'>)`
  - `@OnEvent('media.folder_deleted', { async: true })` → `onMediaFolderDeleted(payload: EventPayload<'media.folder_deleted'>)`
- Each handler calls `this.log()` with appropriate `action`, `entityType` (`'media'` or `'media_folder'`), `entityId`, `entityName`, `userId`

**Definition of Done:**
- [ ] All four media event handlers are registered in ActivityService
- [ ] Media uploads appear in activity log with correct action, entity type, and user
- [ ] Media deletions appear in activity log
- [ ] Folder creation/deletion appears in activity log
- [ ] All tests pass
- [ ] No diagnostics errors

**Verify:**
- `bun run check-types`

---

### Task 4: Frontend — HTTP Adapter, Hooks, and Folder Creation Wiring

**Objective:** Add `createFolder` and `deleteFolder` operations to the API adapter and React hooks, then wire the "New Folder" button in `MediaLibraryPage` to actually create folders.

**Dependencies:** Task 1, Task 2

**Files:**
- Modify: `packages/client/admin/src/core/adapters/types.ts`
- Modify: `packages/client/admin/src/core/adapters/http-adapter.ts`
- Modify: `packages/client/admin/src/hooks/useMedia.ts`
- Modify: `packages/client/admin/src/features/media-library/components/MediaLibraryPage.tsx`

**Key Decisions / Notes:**
- Depends on Task 2 because `MediaItem.createdByName` field requires the backend schema change from Task 2 to exist first
- Add to `MagnetApiAdapter.media` interface:
  - `createFolder(name: string, parentPath?: string): Promise<MediaFolder>`
  - `deleteFolder(path: string): Promise<{ success: boolean }>`
- Add `MediaFolder` type to `types.ts`: `{ id: string; name: string; path: string; parentPath?: string; createdBy?: string; createdByName?: string; itemCount: number; createdAt: string }`
- Update `getFolders()` return type from `Promise<string[]>` to `Promise<MediaFolder[]>`
- Add HTTP adapter implementations calling `POST /media/folders` and `DELETE /media/folders/:path`
- Add `useMediaCreateFolder()` and `useMediaDeleteFolder()` hooks with query invalidation
- Update `MediaLibraryPage.handleCreateFolder()` (line 239-244) to call `createFolder` mutation instead of showing a toast
- Update `transformedFolders` in `MediaLibraryPage` to use the new `MediaFolder` shape with real item counts
- Also add `createdByName` field to `MediaItem` interface in `types.ts`

**Definition of Done:**
- [ ] Clicking "New Folder" opens drawer, entering a name creates the folder via API
- [ ] New folder appears in the folder grid after creation
- [ ] `getFolders()` returns folder objects with item counts
- [ ] `MediaItem` type includes `createdByName`
- [ ] All tests pass
- [ ] No diagnostics errors

**Verify:**
- `bun run check-types`

---

### Task 5: Frontend — Document Thumbnails with File-Type Icons

**Objective:** Replace the plain "Document" text in `AssetCard` with file-type-specific icons (PDF, DOC, XLS, etc.) for non-image/non-video files.

**Dependencies:** None

**Files:**
- Modify: `packages/client/admin/src/features/media-library/components/AssetCard.tsx`
- Modify: `packages/client/admin/src/features/media-library/components/AssetGrid.tsx` (list view)
- Modify: `packages/client/admin/src/features/media-library/components/MediaViewDrawer.tsx` (preview section)

**Key Decisions / Notes:**
- Use lucide-react icons: `FileText` (PDF, text), `FileSpreadsheet` (XLS, CSV), `FileType` (DOC, DOCX), `File` (generic), `FileArchive` (ZIP), `FileCode` (code files), `FileImage` (SVG)
- Create a helper function `getDocumentIcon(format: string)` that maps file extensions to icons and colors:
  - PDF → `FileText` with red accent
  - DOC/DOCX → `FileType` with blue accent
  - XLS/XLSX/CSV → `FileSpreadsheet` with green accent
  - ZIP/RAR/7Z → `FileArchive` with yellow accent
  - SVG → `FileImage` with purple accent
  - Default → `File` with gray accent
- Update `AssetCard` document section (line 47-50) to use the icon function
- Update the list view in `AssetGrid` to show file-type icon thumbnails for documents
- Update `MediaViewDrawer` preview area (line 141-143) to show the same icon instead of "Document" text

**Definition of Done:**
- [ ] PDF files show a red PDF icon in the asset grid
- [ ] DOC/DOCX files show a blue document icon
- [ ] XLS files show a green spreadsheet icon
- [ ] Generic documents show a file icon
- [ ] Icons appear in both grid and list views
- [ ] The drawer preview also uses the icon instead of "Document" text
- [ ] All tests pass
- [ ] No diagnostics errors

**Verify:**
- `bun run check-types`

---

### Task 6: Frontend — Wire Drawer Buttons (Move, Subfolder, Uploaded By)

**Objective:** Wire the "Move" button, "Create new subfolder" button, and fix the "Uploaded By" display in `MediaViewDrawer`.

**Dependencies:** Task 4, Task 5

**Files:**
- Modify: `packages/client/admin/src/features/media-library/components/MediaViewDrawer.tsx`
- Modify: `packages/client/admin/src/features/media-library/components/MediaLibraryPage.tsx`

**Key Decisions / Notes:**
- **Uploaded By:** Update `transformMediaToAsset()` in `MediaLibraryPage` to use `media.createdByName` (falls back to `media.createdBy` for backward compat). The `Asset` interface already has `uploadedBy?: string` which the drawer displays.
- **Move button (line 237-239):** Add `onMove` callback prop to `MediaViewDrawerProps`. When clicked, show an inline folder selector (a `<Select>` dropdown populated from `useMediaFolders()`). On selection, call `useMediaUpdate` to update the file's `folder` field. Close dropdown and show success toast. **Note:** The backend already supports updating the folder field — `PUT /media/:id` accepts `{ folder: string }` via `UpdateMediaDto` (storage.controller.ts:28-33) and `StorageService.update()` (storage.service.ts:274-285). No backend changes needed for move.
- **Create subfolder (line 241-244):** Add `onCreateSubfolder` callback prop. When clicked, show an inline text input + confirm button. On confirm, call `useMediaCreateFolder` with `parentPath` set to the asset's current location. Show success toast.
- **Open Original button (line 158-161):** Wire to open `asset.url` in a new tab via `window.open(url, '_blank')`
- Pass new callbacks from `MediaLibraryPage` into `MediaViewDrawer`

**Definition of Done:**
- [ ] "Uploaded By" shows the user's display name instead of "Unknown" or a user ID
- [ ] "Move" button shows a folder selector dropdown; selecting a folder moves the file and refreshes
- [ ] "Create new subfolder" shows an inline input; entering a name creates the subfolder
- [ ] "Open Original" button opens the file URL in a new tab
- [ ] All tests pass
- [ ] No diagnostics errors

**Verify:**
- `bun run check-types`

---

### Task 7: Frontend — Expanded File Preview (Image Viewer + PDF Embed)

**Objective:** Wire the Maximize2 button in `MediaViewDrawer` to toggle an expanded preview mode showing full image viewing or embedded PDF reader.

**Dependencies:** Task 5

**Files:**
- Modify: `packages/client/admin/src/features/media-library/components/MediaViewDrawer.tsx`

**Key Decisions / Notes:**
- Add `isExpanded` state to the drawer component
- Wire the Maximize2 button (line 113-114) to toggle `isExpanded`
- When expanded, change `SheetContent` width to `sm:max-w-3xl` or full-screen overlay
- Replace the aspect-video preview with a larger preview area:
  - **Images:** Full-width `<img>` with `object-contain`, max height viewport
  - **PDFs:** `<iframe src={asset.url} />` using the browser's built-in PDF viewer. Set `type="application/pdf"` and appropriate dimensions. **Note on CORS:** In dev mode (admin on :5173, API on :3000), the iframe will be cross-origin. The Vite dev server proxy should handle this (`/media/file/*` proxied to the API). In production, both are served from the same origin. If the iframe shows blank, fall back to a download link.
  - **Other documents:** Show the file-type icon (from Task 5) at large size + file info + prominent download button
- Add a Minimize2 button when expanded to toggle back
- When collapsed (default), show the current aspect-video preview

**Definition of Done:**
- [ ] Clicking expand button widens the drawer and shows full preview
- [ ] Images display at full resolution within the expanded area
- [ ] PDFs display in an embedded browser viewer (iframe) with scroll/zoom
- [ ] Other documents show a large file-type icon with download option
- [ ] Clicking minimize returns to the compact drawer view
- [ ] All tests pass
- [ ] No diagnostics errors

**Verify:**
- `bun run check-types`

---

### Task 8: E2E Tests

**Objective:** Write API and UI end-to-end tests covering the new media library functionality.

**Dependencies:** Tasks 1-7

**Files:**
- Create: `apps/e2e/tests/api/media-library.spec.ts`
- Create: `apps/e2e/tests/ui/media-library.spec.ts`

**Key Decisions / Notes:**
- API tests (project: `api`):
  - Folder CRUD: create, list, delete, reject delete-with-files
  - Upload with createdByName populated
  - Move file between folders (update folder field)
  - Activity log contains media events after upload/delete/folder operations
- UI tests (project: `ui`):
  - Create folder via New Folder drawer
  - Upload a file and verify it appears in the grid
  - Open file drawer and verify "Uploaded By" shows a name
  - Move a file to a different folder
  - Expand the drawer and verify preview content
- Follow existing test patterns in `apps/e2e/tests/`
- Use Playwright test fixtures from `apps/e2e/src/fixtures/`
- **Setup:** UI tests must use an existing test user fixture that produces a known `createdByName`. Check `apps/e2e/src/fixtures/auth.fixture.ts` for authentication helpers and seed a test folder + file via API before each test. The test user's name must be asserted in the "Uploaded By" field.

**Definition of Done:**
- [ ] API tests pass for folder CRUD, upload with user name, file move, activity log
- [ ] UI tests pass for folder creation, upload, drawer info, move, expand
- [ ] All existing tests still pass
- [ ] No diagnostics errors

**Verify:**
- `bun run test:e2e --project=api`
- `bun run test:e2e --project=ui`

## Open Questions
None — all design decisions resolved.

## Deferred Ideas
- Server-side PDF thumbnail generation (render first page as image at upload time)
- Bulk move operations (move multiple selected files to a folder)
- Folder drag-and-drop reordering
- Video preview/playback in the expanded view
- Crop functionality for images
