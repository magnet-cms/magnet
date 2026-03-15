# Webhook Manager Core Module Implementation Plan

Created: 2026-03-14
Status: COMPLETE
Approved: Yes
Iterations: 0
Worktree: Yes
Type: Feature

## Summary

**Goal:** Build a webhook manager core module that allows CMS admins to configure outgoing HTTP webhooks that fire on any system event (content, user, auth, media, settings, roles, API keys, plugins). Webhooks support global event subscriptions, full document payloads, HMAC-SHA256 signing, retry with exponential backoff, and delivery logging. Includes a full Admin UI page for webhook CRUD and delivery history.

**Architecture:** New `webhook` module in `packages/core/src/modules/webhook/` using the `@OnEvent('*')` pattern to listen to all system events. Webhook configurations and delivery logs are stored in the database via `@Schema`. The module subscribes to the existing `EventService` and fires HTTP requests to configured URLs. Admin UI adds a `features/webhooks/` section with a listing page (CRUD) and delivery log viewer.

**Tech Stack:** NestJS module, `@Schema`/`@Field` decorators, `EventService` + `@OnEvent`, native `fetch()` for HTTP delivery, HMAC-SHA256 via Node `crypto`, React + shadcn/ui for admin page

## Scope

### In Scope
- Webhook CRUD REST API (create, read, update, delete, test)
- Database schema for webhook configs and delivery logs
- Event listener that fires webhooks on matching events (all 40+ event types)
- Full document/entity data in webhook payloads
- HMAC-SHA256 request signing with per-webhook secret
- Simple retry with exponential backoff (3 retries: 1s, 5s, 30s)
- Delivery log with status codes, response times, error messages
- Admin settings for webhook module (enable/disable, max retries, timeout)
- Admin UI page: webhook listing, create/edit dialog, delivery log viewer, test button
- Sidebar navigation entry for webhooks
- E2E tests for webhook API

### Out of Scope
- Per-schema event filtering (subscribe to `content.created` on "posts" only) — deferred
- Persistent job queue / background worker for retries — in-process retries only
- Webhook secret rotation UI — manual via API only
- Rate limiting per webhook — deferred
- Webhook templates / transformations — deferred

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - Module structure: `packages/core/src/modules/notification/` — schema, service, controller, settings, module, index.ts, constants
  - Schema definition: `packages/core/src/modules/notification/schemas/notification.schema.ts:11-83` — `@Schema`, `@Field.Text`, `@Field.Boolean`, `@Field.Date`, `@Prop`
  - Module registration: `packages/core/src/modules/notification/notification.module.ts:41-58` — `forRoot()` with `DatabaseModule.forFeature()` and `SettingsModule.forFeature()`
  - Settings: `packages/core/src/modules/notification/notification.settings.ts:14-82` — `@Settings`, `@SettingField.Boolean`, `@SettingField.Number`
  - Event handling: `packages/core/src/modules/activity/activity.service.ts` — uses `@OnEvent` decorator to react to events
  - Controller with auth: `packages/core/src/modules/vault/vault.controller.ts:31-33` — `@Controller('webhook')` + `@RestrictedRoute()`
  - MagnetModule import: `packages/core/src/magnet.module.ts:90` — add `WebhookModule.forRoot()` to imports array
  - Admin UI feature: `packages/client/admin/src/features/api-keys/` — listing page pattern with CRUD
  - Admin routes: `packages/client/admin/src/routes/index.tsx:275-278` — add route for `/webhooks`
  - Admin sidebar: `packages/client/admin/src/layouts/DashboardLayout/AppSidebar.tsx:56-93` — add webhook entry with `order: 65` (between Activity and Settings)

- **Conventions:**
  - `@Schema({ versioning: false, i18n: false, visible: false })` for internal system schemas
  - All schemas hidden from Content Manager with `visible: false`
  - `@RestrictedRoute()` on controllers for admin-only access
  - Event types defined in `packages/common/src/types/events.types.ts` — webhook events already exist
  - Biome for linting/formatting, TypeScript strict mode, no `any` types

- **Key files:**
  - `packages/common/src/types/events.types.ts` — `EventName` union (40+ events), `EventPayload<E>`, `WebhookEventPayload`, `WebhookDeliveryEventPayload`
  - `packages/core/src/modules/events/event.service.ts` — `EventService.on()`, `EventService.emit()`
  - `packages/core/src/modules/events/event-handler-discovery.service.ts` — auto-discovers `@OnEvent` handlers
  - `packages/core/src/magnet.module.ts` — where the new module must be imported
  - `packages/core/src/index.ts` — must export new module for external access

- **Gotchas:**
  - `EventService` is `@Global()` — available everywhere without importing `EventsModule`
  - Event handlers decorated with `@OnEvent` are auto-discovered on module init via `DiscoveryModule`
  - The `@OnEvent` decorator only accepts a single `EventName` — to listen to ALL events, register handlers programmatically via `EventService.on()` in `onModuleInit`
  - The `EventPayload` includes `timestamp`, `userId`, `ipAddress`, `requestId` as base fields
  - Webhook event types (`webhook.created`, `webhook.delivery_success`, etc.) are already defined — use them for webhook lifecycle events
  - `fetch()` is available natively in Bun and Node 18+ — no need for `axios` or `node-fetch`

- **Domain context:**
  - Webhooks are admin-configured outgoing HTTP POST requests triggered by internal events
  - Each webhook has: name, URL, events list, secret (for HMAC signing), custom headers, enabled flag
  - Delivery logs track: webhook ID, event name, payload, response status, duration, retry count, error
  - The signing header `X-Magnet-Signature` contains `sha256=<hmac>` (matches GitHub webhook format)

## Runtime Environment

- **Start command:** `bun run dev` in example app dir
- **API Port:** 3000
- **Admin UI Port:** 3001 (Vite dev server)
- **Health check:** GET `/health`

## Assumptions

- `fetch()` is available at runtime (Bun 1.2.2+ and Node 18+) — no external HTTP client needed. All tasks depend on this.
- The `EventService.on()` method can register a wildcard-like handler by calling `.on()` for each event type in a loop. Verified: `EventService.on()` at `event.service.ts:65` accepts any `EventName`. Tasks 3, 4 depend on this.
- `@Schema({ visible: false })` hides schemas from the Content Manager discovery endpoint. Verified in `notification.schema.ts:11`. Tasks 1, 2 depend on this.
- The admin UI can add a new top-level sidebar item by adding to `coreSidebarItems` in `AppSidebar.tsx:56`. Verified. Task 8 depends on this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| In-process retries block the event loop during backoff | Medium | Medium | Use `setTimeout` for delays, not blocking sleep. Retries fire asynchronously and don't block the request that triggered the event. |
| High webhook volume creates too many delivery logs | Low | Medium | Add a retention setting (default 30 days). Implement cleanup on module init. |
| Webhook secrets exposed in API responses | Low | High | Never return the secret in GET responses — only return a masked version (e.g., `***...abc`). Only set it via POST/PUT. |
| Slow webhook URLs block other webhooks | Medium | Medium | Each webhook delivery runs asynchronously with a timeout (default 10s). One slow URL doesn't block others. |

## Goal Verification

### Truths
1. `POST /webhooks` creates a webhook with name, URL, events, and secret — returns the webhook object (secret masked)
2. When content is created via `POST /content/:schema`, all webhooks subscribed to `content.created` receive an HTTP POST with the event data and full document
3. The `X-Magnet-Signature` header on outgoing requests contains a valid HMAC-SHA256 of the request body using the webhook's secret
4. Failed deliveries retry 3 times with exponential backoff (1s, 5s, 30s) and log each attempt
5. `GET /webhooks/:id/deliveries` returns a paginated list of delivery logs with status, duration, and error info
6. The Admin UI shows a webhooks page at `/webhooks` with a table of configured webhooks and a create/edit dialog
7. `POST /webhooks/:id/test` sends a test payload to the webhook URL and returns the delivery result

### Artifacts
- `packages/core/src/modules/webhook/schemas/webhook.schema.ts` — webhook config schema
- `packages/core/src/modules/webhook/schemas/webhook-delivery.schema.ts` — delivery log schema
- `packages/core/src/modules/webhook/webhook.service.ts` — webhook CRUD + delivery logic
- `packages/core/src/modules/webhook/webhook.controller.ts` — REST API
- `packages/core/src/modules/webhook/webhook.settings.ts` — admin settings
- `packages/core/src/modules/webhook/webhook.listener.ts` — event listener that fires webhooks
- `packages/client/admin/src/features/webhooks/` — admin UI feature
- `apps/e2e/tests/api/webhooks.spec.ts` — E2E tests

## Progress Tracking

- [x] Task 1: Webhook and delivery log database schemas
- [x] Task 2: Webhook CRUD service with HMAC signing and delivery logic
- [x] Task 3: Webhook event listener
- [x] Task 4: Webhook REST API controller
- [x] Task 5: Webhook settings and module registration
- [x] Task 6: Admin UI — webhooks listing page
- [x] Task 7: Admin UI — webhook create/edit dialog and delivery log
- [x] Task 8: Admin UI — sidebar navigation and routing
- [x] Task 9: E2E tests for webhook API
- [x] Task 10: Documentation

**Total Tasks:** 10 | **Completed:** 10 | **Remaining:** 0

## Implementation Tasks

### Task 1: Webhook and delivery log database schemas

**Objective:** Create the two database schemas — `Webhook` (configuration) and `WebhookDelivery` (delivery log) — using the existing `@Schema`/`@Field` pattern.

**Dependencies:** None

**Files:**
- Create: `packages/core/src/modules/webhook/schemas/webhook.schema.ts`
- Create: `packages/core/src/modules/webhook/schemas/webhook-delivery.schema.ts`

**Key Decisions / Notes:**
- Follow `packages/core/src/modules/notification/schemas/notification.schema.ts` pattern
- Both schemas: `@Schema({ versioning: false, i18n: false, visible: false })`
- Webhook fields: `name` (text, required), `url` (text, required), `events` (array of strings — event names), `secret` (text — HMAC secret, auto-generated if not provided), `headers` (object — custom headers), `enabled` (boolean, default true), `description` (text, optional), `createdAt` (date), `updatedAt` (date)
- WebhookDelivery fields: `webhookId` (text, required), `event` (text — event name), `url` (text), `payload` (object — sent JSON), `statusCode` (number), `responseBody` (text — truncated to 1KB), `duration` (number — ms), `success` (boolean), `error` (text — error message), `retryCount` (number), `createdAt` (date)
- Use `@Field.Text()` for simple fields, `@Prop({ type: [String] })` for arrays, `@Prop({ type: Object })` for objects

**Definition of Done:**
- [ ] `Webhook` schema class with all fields typed and decorated
- [ ] `WebhookDelivery` schema class with all fields typed and decorated
- [ ] Both schemas compile without type errors
- [ ] `bun run check-types` passes in core package

**Verify:**
- `cd packages/core && npx tsc --noEmit`

---

### Task 2: Webhook CRUD service with HMAC signing and delivery logic

**Objective:** Create the `WebhookService` with CRUD operations, HMAC-SHA256 signing, HTTP delivery with retries, and delivery logging.

**Dependencies:** Task 1

**Files:**
- Create: `packages/core/src/modules/webhook/webhook.service.ts`
- Create: `packages/core/src/modules/webhook/webhook.constants.ts`

**Key Decisions / Notes:**
- Inject database models via `@Inject(DatabaseAdapter.token('Webhook'))` and `@Inject(DatabaseAdapter.token('WebhookDelivery'))` — follow the pattern in `notification.service.ts`
- Actually, follow the exact injection pattern used in `ContentService` or `NotificationService` — check how they inject the Model
- `create(data)` — generates a random secret (32 bytes hex via `crypto.randomBytes`) if not provided
- `findAll()` — return webhooks with secret masked (`***...last4chars`)
- `findById(id)` — same masking
- `update(id, data)` — allow updating all fields except secret (separate endpoint for secret regeneration)
- `delete(id)` — soft delete or hard delete (hard delete — matching vault pattern)
- `regenerateSecret(id)` — generate new secret, return it (only time full secret is visible)
- `enrichPayload(event, payload)` — for `content.*` events, fetch the full document via `ContentService` using `documentId` and `schema` from the payload. For non-content events, the raw EventPayload already contains all relevant data.
- `deliver(webhook, event, payload)` — sends HTTP POST with JSON body (enriched), adds `X-Magnet-Signature` header, respects custom headers, returns delivery result
- `deliverWithRetry(webhook, event, payload)` — calls deliver(), retries on failure with 1s/5s/30s backoff using `setTimeout`
- `logDelivery(webhookId, event, result)` — creates `WebhookDelivery` record
- `getDeliveries(webhookId, page, limit)` — paginated delivery log
- `testWebhook(id)` — sends a test event payload and returns the result
- HMAC signing: `crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex')` → `sha256=<hex>`

**Definition of Done:**
- [ ] `WebhookService` class with all CRUD methods
- [ ] Content event payloads enriched with full document data via ContentService
- [ ] HMAC-SHA256 signing generates correct `X-Magnet-Signature` header
- [ ] Retry logic delays 1s, 5s, 30s between attempts
- [ ] Delivery logging creates `WebhookDelivery` records
- [ ] Secret is masked in `findAll()` and `findById()` responses
- [ ] `bun run check-types` passes

**Verify:**
- `cd packages/core && npx tsc --noEmit`

---

### Task 3: Webhook event listener

**Objective:** Create a service that listens to ALL system events and dispatches matching webhooks.

**Dependencies:** Task 2

**Files:**
- Create: `packages/core/src/modules/webhook/webhook.listener.ts`

**Key Decisions / Notes:**
- Implements `OnModuleInit` to register event handlers on startup
- In `onModuleInit()`: iterate ALL event names from `EventName` type EXCEPT `webhook.*` events and call `EventService.on(eventName, handler, { async: true, name: 'webhook-dispatcher' })` for each
- **IMPORTANT:** Exclude all `webhook.*` events (`webhook.created`, `webhook.updated`, `webhook.deleted`, `webhook.delivery_success`, `webhook.delivery_failed`) from dispatch to prevent reflexive delivery loops. If a webhook subscribes to `webhook.*` events, delivery would trigger more deliveries infinitely.
- The handler: loads all enabled webhooks, filters by `webhook.events.includes(eventName)`, then calls `WebhookService.deliverWithRetry()` for each match
- Must be async (fire-and-forget) to not block the original event chain
- Cache enabled webhooks in memory with a short TTL (e.g., 30s) to avoid DB queries on every event. Invalidate on webhook CRUD operations.
- Import the full list of event names — define a constant `ALL_EVENT_NAMES` array derived from the `EventName` type

**Definition of Done:**
- [ ] `WebhookListenerService` registers handlers for all event types on init
- [ ] When an event fires, matching enabled webhooks receive HTTP POST
- [ ] Webhook delivery is async and doesn't block the event emitter
- [ ] `bun run check-types` passes

**Verify:**
- `cd packages/core && npx tsc --noEmit`

---

### Task 4: Webhook REST API controller

**Objective:** Create the webhook controller with CRUD endpoints, delivery log, and test endpoint.

**Dependencies:** Task 2

**Files:**
- Create: `packages/core/src/modules/webhook/webhook.controller.ts`

**Key Decisions / Notes:**
- `@Controller('webhooks')` + `@RestrictedRoute()` — admin-only
- Endpoints:
  - `GET /webhooks` — list all webhooks (secrets masked)
  - `GET /webhooks/:id` — get single webhook (secret masked)
  - `POST /webhooks` — create webhook (returns full secret once)
  - `PUT /webhooks/:id` — update webhook (name, url, events, headers, enabled, description)
  - `DELETE /webhooks/:id` — delete webhook
  - `POST /webhooks/:id/regenerate-secret` — regenerate secret (returns full new secret)
  - `POST /webhooks/:id/test` — send test payload and return result
  - `GET /webhooks/:id/deliveries` — paginated delivery logs (query params: page, limit)
- Follow `vault.controller.ts` pattern for structure
- Emit `webhook.created`, `webhook.updated`, `webhook.deleted` events on CRUD

**Definition of Done:**
- [ ] All 8 endpoints implemented with proper decorators
- [ ] Auth required on all endpoints (`@RestrictedRoute()`)
- [ ] Create returns full secret; subsequent GETs mask it
- [ ] Test endpoint returns delivery result (status code, success, duration)
- [ ] `bun run check-types` passes

**Verify:**
- `cd packages/core && npx tsc --noEmit`

---

### Task 5: Webhook settings and module registration

**Objective:** Create webhook settings, the module file, and register it in MagnetModule.

**Dependencies:** Tasks 1-4

**Files:**
- Create: `packages/core/src/modules/webhook/webhook.settings.ts`
- Create: `packages/core/src/modules/webhook/webhook.module.ts`
- Create: `packages/core/src/modules/webhook/index.ts`
- Modify: `packages/core/src/magnet.module.ts` — add `WebhookModule.forRoot()` to imports
- Modify: `packages/core/src/index.ts` — export webhook module

**Key Decisions / Notes:**
- Settings: `@Settings({ group: 'webhooks', label: 'Webhooks', icon: 'webhook', order: 60 })`
  - `enabled` (boolean, default true) — master switch
  - `maxRetries` (number, default 3) — retry count
  - `timeoutMs` (number, default 10000) — request timeout
  - `retentionDays` (number, default 30) — delivery log retention
- Module follows `NotificationModule.forRoot()` pattern:
  - `DatabaseModule.forFeature(Webhook, WebhookDelivery)`
  - `SettingsModule.forFeature(WebhookSettings)`
  - Providers: `WebhookService`, `WebhookListenerService`
  - Controllers: `WebhookController`
  - Exports: `WebhookService`
- Register in `MagnetModule.forRoot()` imports array after `NotificationModule.forRoot()` (around line 90)
- Export from `packages/core/src/index.ts`

**Definition of Done:**
- [ ] Settings schema compiles and registers with settings system
- [ ] Module file with `forRoot()` static method
- [ ] `MagnetModule` imports `WebhookModule.forRoot()`
- [ ] `packages/core/src/index.ts` exports webhook module
- [ ] Full `bun run check-types` passes (all packages)
- [ ] App starts without errors

**Verify:**
- `bun run check-types`

---

### Task 6: Admin UI — webhooks listing page

**Objective:** Create the webhooks listing page component with a table showing all configured webhooks.

**Dependencies:** Task 4 (API available)

**Files:**
- Create: `packages/client/admin/src/features/webhooks/index.ts`
- Create: `packages/client/admin/src/features/webhooks/components/WebhooksListingPage.tsx`
- Create: `packages/client/admin/src/features/webhooks/hooks/useWebhooks.ts`

**Key Decisions / Notes:**
- Follow `packages/client/admin/src/features/api-keys/` pattern
- `useWebhooks` hook: fetch `GET /webhooks`, mutations for create/update/delete/test
- Table columns: Name, URL (truncated), Events (count badge), Enabled (toggle), Last delivery status, Actions
- Empty state when no webhooks configured
- Use shadcn/ui `Table`, `Badge`, `Switch`, `Button` components
- Page header with "Create Webhook" button

**Definition of Done:**
- [ ] Listing page renders webhook table from API data
- [ ] Empty state shown when no webhooks
- [ ] Enable/disable toggle works inline
- [ ] `bun run check-types` passes (admin package)

**Verify:**
- `cd packages/client/admin && npx tsc --noEmit`

---

### Task 7: Admin UI — webhook create/edit dialog and delivery log

**Objective:** Add create/edit webhook dialog and delivery log viewer to the webhooks feature.

**Dependencies:** Task 6

**Files:**
- Create: `packages/client/admin/src/features/webhooks/components/WebhookFormDialog.tsx`
- Create: `packages/client/admin/src/features/webhooks/components/WebhookDeliveryLog.tsx`
- Modify: `packages/client/admin/src/features/webhooks/components/WebhooksListingPage.tsx` (wire dialogs)

**Key Decisions / Notes:**
- **Form dialog:** Name, URL, Description, Events (multi-select from all event names), Custom headers (key-value pairs), Enabled toggle
- Events multi-select: group by category (Content, User, Auth, Role, Settings, Media, API Key, Plugin, System)
- **Delivery log:** Expandable panel or slide-over showing deliveries for a webhook
  - Table: Event, Status (green/red badge), Duration, Retry count, Timestamp
  - Click row to see full payload and response
- **Test button:** In the webhook row actions or edit dialog — calls `POST /webhooks/:id/test`, shows result in toast

**Definition of Done:**
- [ ] Create dialog opens, validates form, calls API
- [ ] Edit dialog pre-fills fields from existing webhook
- [ ] Events multi-select shows all 40+ events grouped by category
- [ ] Delivery log shows paginated history
- [ ] Test button sends test webhook and shows result
- [ ] `bun run check-types` passes

**Verify:**
- `cd packages/client/admin && npx tsc --noEmit`

---

### Task 8: Admin UI — sidebar navigation and routing

**Objective:** Add webhooks to the admin sidebar and register the route.

**Dependencies:** Tasks 6, 7

**Files:**
- Modify: `packages/client/admin/src/layouts/DashboardLayout/AppSidebar.tsx` — add webhooks sidebar item
- Modify: `packages/client/admin/src/routes/index.tsx` — add webhooks route and import

**Key Decisions / Notes:**
- Sidebar item: `{ title: 'Webhooks', url: '/webhooks', icon: Webhook, order: 75 }` — between Activity (70) and Settings (90). Use `Webhook` icon from `lucide-react`.
- Route: `{ path: 'webhooks', element: withSuspense(WebhooksListingPage) }` in `coreDashboardRoutes`
- Import: `import { WebhooksListingPage } from '~/features/webhooks'`
- Add i18n message key: `nav.webhooks` with default message "Webhooks"

**Definition of Done:**
- [ ] Webhooks appears in the admin sidebar with the Webhook icon
- [ ] Clicking navigates to `/webhooks` and renders the listing page
- [ ] `bun run check-types` passes

**Verify:**
- `cd packages/client/admin && npx tsc --noEmit`

---

### Task 9: E2E tests for webhook API

**Objective:** Create E2E tests for the webhook REST API covering CRUD, delivery, and test endpoint.

**Dependencies:** Tasks 4, 5 (backend complete)

**Files:**
- Create: `apps/e2e/tests/api/webhooks.spec.ts`
- Modify: `apps/e2e/src/helpers/api-client.ts` — add webhook methods

**Key Decisions / Notes:**
- Add to ApiClient: `createWebhook()`, `getWebhooks()`, `getWebhook(id)`, `updateWebhook(id, data)`, `deleteWebhook(id)`, `testWebhook(id)`, `getWebhookDeliveries(id)`, `regenerateWebhookSecret(id)`
- Tests:
  - CRUD flow: create → list → get (secret masked) → update → verify → delete
  - Test endpoint: create webhook pointing to a known URL (could use httpbin or the CMS's own `/health` endpoint), fire test, verify delivery logged
  - Secret masking: verify GET response has masked secret
  - Auth required: verify 401 without token
  - Enable/disable: create disabled webhook, trigger event, verify no delivery
  - Event-triggered delivery: create a webhook pointing to the app's own `/health` endpoint subscribed to `content.created`, create content via API, wait up to 5s, verify a `WebhookDelivery` record exists with `success=true` via `GET /webhooks/:id/deliveries`

**Definition of Done:**
- [ ] CRUD test: create, read, update, delete webhook
- [ ] Secret masking verified in GET responses
- [ ] Test endpoint fires and returns delivery result
- [ ] Auth required on all endpoints
- [ ] No TypeScript errors

**Verify:**
- `cd apps/e2e && bun run check-types`

### Task 10: Documentation

**Objective:** Create MDX documentation for the webhook module and update navigation.

**Dependencies:** Task 5

**Files:**
- Create: `apps/docs/content/docs/core/webhooks.mdx`
- Modify: `apps/docs/content/docs/core/meta.json` — add webhooks entry

**Key Decisions / Notes:**
- Follow existing docs pattern (frontmatter with `title` and `description`)
- Include: overview, configuration, event types, payload format, HMAC verification example, API endpoints reference
- TypeScript code examples for: creating webhooks via API, verifying signatures in a receiver

**Definition of Done:**
- [ ] `webhooks.mdx` exists with frontmatter, overview, and code examples
- [ ] `meta.json` includes webhooks in navigation
- [ ] Docs build without errors

**Verify:**
- `ls apps/docs/content/docs/core/webhooks.mdx`

---

## Open Questions

None — all design decisions resolved.

### Deferred Ideas

- **Per-schema filtering:** Allow webhooks to subscribe to events on specific schemas only (e.g., "content.created on posts only"). Requires extending the webhook schema with an optional `schemaFilter` field.
- **Webhook templates:** Transform payloads before sending (e.g., map Magnet fields to Slack blocks format).
- **Rate limiting:** Per-webhook rate limits to prevent flooding external services.
- **Secret rotation UI:** Admin UI for rotating webhook secrets with grace period for old secret.
- **Persistent retry queue:** Database-backed retry queue for handling server restarts during retry backoff.
- **Webhook response actions:** Parse webhook responses to trigger CMS actions (e.g., block content publishing if moderation webhook rejects).
