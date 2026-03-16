# Polar.sh Plugin Implementation Plan

Created: 2026-03-16
Status: COMPLETE
Approved: Yes
Iterations: 1
Worktree: No
Type: Feature

## Summary

**Goal:** Build `@magnet-cms/plugin-polar` — a full Magnet CMS plugin for Polar.sh payments that mirrors the Stripe plugin architecture: backend services, database schemas, webhook processing, checkout/portal sessions, subscription access with feature flags, benefit management, admin dashboard with metrics, and full admin frontend.

**Architecture:** NestJS module following the exact same patterns as `@magnet-cms/plugin-stripe`. Core SDK service wraps `@polar-sh/sdk`. Domain services (customer, product, subscription, order, benefit, checkout, portal, access, metrics) persist synced data via Magnet schemas. Two controllers (API + webhook). Admin frontend as IIFE bundle with dashboard, customers, products, subscriptions, orders, and benefits pages.

**Tech Stack:** `@polar-sh/sdk` (Polar JS SDK), NestJS, Magnet `@Schema`/`@Field` decorators, React admin frontend with `@magnet-cms/ui` components, Vite IIFE build.

## Scope

### In Scope

- Core Polar SDK service with initialization and config validation
- 7 database schemas: Customer, Product, Subscription, Order, Benefit, BenefitGrant, ProcessedEvent
- 8 domain services: Customer, Product, Subscription, Order, Benefit, Checkout, Access, Metrics
- API controller with public + admin endpoints
- Webhook controller with signature verification via `validateEvent()`
- Webhook service with idempotent event dispatching
- Checkout session creation via Polar SDK
- Customer portal session creation via Polar SDK
- Subscription access and feature flags resolution
- Metrics dashboard using `polar.metrics.get()` API
- Full admin frontend: Dashboard, Customers, Products, Subscriptions, Orders, Benefits pages
- Package configuration: `package.json`, `tsup.config.ts`, `vite.config.ts`
- Backend + frontend export structure matching Stripe plugin
- E2E tests for API endpoints

### Out of Scope

- Integration into example apps (explicitly excluded by user)
- Polar OAuth2 flows (can be added later)
- Usage-based metering / seat-based subscriptions (advanced Polar features)
- Discount/coupon management (can be added as enhancement)
- Documentation pages in `apps/docs`

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:** The Stripe plugin at `packages/plugins/stripe/src/` is the exact template. Every file in the Polar plugin should have a 1:1 counterpart in the Stripe plugin (with naming adjusted from `Stripe` → `Polar`).
- **Conventions:**
  - Schemas use `@Schema({ versioning: false, i18n: false, visible: false })` — these are internal sync tables
  - Services use `@Injectable()`, inject models via `@InjectModel(SchemaClass)`, inject plugin config via `@InjectPluginOptions('polar')`
  - Controllers use `@Controller('polar')` prefix, admin endpoints use `@RestrictedRoute()`
  - All imports from Magnet: `Model`, `BaseSchema`, `InjectModel` from `@magnet-cms/common`; `Plugin`, `DatabaseModule`, `InjectPluginOptions`, `RestrictedRoute` from `@magnet-cms/core`
- **Key files:**
  - `packages/plugins/stripe/src/plugin.ts` — `@Plugin` decorator with frontend routes/sidebar config
  - `packages/plugins/stripe/src/stripe.module.ts` — NestJS module registering schemas, controllers, services
  - `packages/plugins/stripe/src/stripe.service.ts` — Core SDK wrapper pattern
  - `packages/plugins/stripe/src/stripe-webhook.controller.ts` — Webhook controller with rawBody verification
  - `packages/plugins/stripe/src/stripe-webhook.service.ts` — Idempotent event dispatching pattern
  - `packages/plugins/stripe/src/admin/index.ts` — Frontend self-registration via `window.__MAGNET_PLUGINS__`
  - `packages/plugins/stripe/package.json` — Dual backend/frontend export structure
- **Gotchas:**
  - Polar SDK uses `Result` types with `.ok` check (not exceptions) for some operations
  - Polar webhook verification uses `validateEvent(body, headers, secret)` from `@polar-sh/sdk/webhooks` — takes string body and headers object
  - Polar products embed prices in `product.prices[]` array (no separate price entity like Stripe)
  - Polar uses `organizationId` scoping — the access token determines which org
  - Polar's `polar.metrics.get()` returns pre-computed analytics — no need to compute MRR from local data
  - Polar customer `externalId` field maps to Magnet `userId` (like Stripe's metadata approach but native)
- **Domain context:**
  - Polar.sh is a payment/monetization platform similar to Stripe but focused on open-source and SaaS
  - **Orders** are the equivalent of Stripe's payment intents — they represent completed payments
  - **Benefits** are entitlements attached to products (license keys, file downloads, Discord access, custom)
  - **BenefitGrants** are instances of benefits granted to specific customers
  - Customer portal is session-based: create a session via API, redirect customer to the URL

## Assumptions

- `@polar-sh/sdk` npm package provides `Polar` class, `validateEvent` for webhooks, and typed webhook payloads — supported by Context7 SDK docs — Tasks 1, 4, 5 depend on this
- Polar SDK `polar.metrics.get()` accepts `startDate`, `endDate`, `interval` and returns revenue/subscription metrics — supported by Context7 docs — Task 9 depends on this
- Polar SDK `polar.checkouts.create()` returns `{ id, url }` for checkout sessions — supported by Context7 docs — Task 6 depends on this
- Polar SDK `polar.customerSessions.create()` returns `{ token, customerPortalUrl }` for portal — supported by Context7 docs — Task 6 depends on this
- Polar webhook events include `subscription.created`, `subscription.updated`, `subscription.canceled`, `order.created`, `order.paid` — supported by Context7 webhook docs — Task 5 depends on this
- The existing Polar scaffold at `packages/plugins/polar/` can be fully overwritten — supported by current TODO-only stub files — All tasks depend on this

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Polar SDK API changes between versions | Low | High | Pin `@polar-sh/sdk` to specific version in package.json; use typed SDK imports |
| Polar metrics API may not return all fields needed for dashboard | Medium | Medium | Fall back to local DB computation for missing fields; metrics service has hybrid fallback |
| Webhook event types may differ from documented examples | Low | Medium | Log unhandled events gracefully; webhook service has default case with logger |
| Benefit types are extensible and may add new variants | Medium | Low | Store benefit type as string field, handle known types in switch with default fallback |
| SDK method signatures may differ from Context7 docs | Medium | Medium | All SDK-calling services have "verify from SDK types" notes; implementer checks `node_modules/@polar-sh/sdk` TypeScript definitions before each service |

## Goal Verification

### Truths

1. `@magnet-cms/plugin-polar` package builds successfully with `bun run build` (both backend tsup and frontend vite)
2. `PolarPlugin` class exports and can be registered in a Magnet app's `MagnetModule.forRoot()` configuration
3. All 7 database schemas are registered via `DatabaseModule.forFeature()` and create tables/collections at startup
4. `POST /polar/webhooks` endpoint verifies webhook signatures and processes events idempotently
5. `POST /polar/checkout` creates a checkout session and returns `{ sessionId, url }`
6. `GET /polar/access/:userId` returns subscription status and feature flags
7. Admin frontend loads as IIFE bundle and renders dashboard with metrics, customers, products, subscriptions, orders, and benefits pages

### Artifacts

1. `packages/plugins/polar/dist/` — built backend (index.js, backend/index.js) + frontend (frontend/bundle.iife.js)
2. `packages/plugins/polar/src/plugin.ts` — Plugin decorator with frontend routes and sidebar
3. `packages/plugins/polar/src/schemas/*.schema.ts` — 7 schema files
4. `packages/plugins/polar/src/polar-webhook.controller.ts` + `polar-webhook.service.ts` — webhook processing
5. `packages/plugins/polar/src/services/checkout.service.ts` — checkout session creation
6. `packages/plugins/polar/src/services/access.service.ts` — subscription access resolution
7. `packages/plugins/polar/src/admin/pages/*.tsx` — 6 admin pages

## Progress Tracking

- [x] Task 1: Core SDK Service & Types
- [x] Task 2: Database Schemas
- [x] Task 3: Customer & Product Services
- [x] Task 4: Subscription & Order Services
- [x] Task 5: Webhook Controller & Service
- [x] Task 6: Checkout & Portal Services
- [x] Task 7: Access Service & Benefit Service
- [x] Task 8: Metrics Service & API Controller
- [x] Task 9: Module, Plugin & Package Configuration
- [x] Task 10: Admin Frontend — Dashboard & Metrics Components
- [x] Task 11: Admin Frontend — Entity Pages (Customers, Products, Subscriptions, Orders, Benefits)
- [x] Task 12: E2E Tests

**Total Tasks:** 12 | **Completed:** 12 | **Remaining:** 0

## Implementation Tasks

### Pre-Implementation Check

Before starting Task 1, run `grep -r 'plugin-polar' packages/ apps/ --include='*.ts' --include='*.tsx' -l` to verify no existing code imports from the polar package. If consumers exist, update them after the stub files are overwritten.

### Task 1: Core SDK Service & Types

**Objective:** Create the core Polar SDK wrapper service and all TypeScript type definitions for the plugin configuration and API responses.

**Dependencies:** None

**Files:**

- Create: `packages/plugins/polar/src/types.ts`
- Create: `packages/plugins/polar/src/polar.service.ts` (overwrite existing stub)

**Key Decisions / Notes:**

- Follow `packages/plugins/stripe/src/stripe.service.ts` pattern exactly
- Config interface: `accessToken` (required), `webhookSecret` (required), `organizationId` (optional), `features` (optional feature flag map — same as Stripe), `server` (optional — 'sandbox' | 'production')
- SDK init: `new Polar({ accessToken, server })` — server defaults to 'production'
- `verifyRawBodyAvailable()` method identical to Stripe's
- `get client(): Polar` accessor with initialization check
- Types mirror Stripe types but adapted: `CreateCheckoutDto`, `CreatePortalDto`, `SessionResponse`, `PolarMetricsResponse`, `SubscriptionAccessResponse`, `PolarPluginConfig`
- For `PolarMetricsResponse`, define the dashboard shape independently and create a mapping function in the metrics service that transforms the raw SDK response. This ensures type errors surface at compile time if the SDK response shape differs from expectations.

**Definition of Done:**

- [ ] `PolarService` initializes SDK on `onModuleInit` and validates config
- [ ] `PolarPluginConfig` interface has all required and optional fields with JSDoc
- [ ] All response type interfaces defined with JSDoc
- [ ] No `any` types — all fields explicitly typed
- [ ] No diagnostics errors

**Verify:**

- `bun run check-types` from monorepo root

---

### Task 2: Database Schemas

**Objective:** Create all 7 database schemas for the Polar plugin using Magnet's `@Schema`/`@Field` decorators.

**Dependencies:** None (schemas are standalone)

**Files:**

- Create: `packages/plugins/polar/src/schemas/customer.schema.ts`
- Create: `packages/plugins/polar/src/schemas/product.schema.ts`
- Create: `packages/plugins/polar/src/schemas/subscription.schema.ts`
- Create: `packages/plugins/polar/src/schemas/order.schema.ts`
- Create: `packages/plugins/polar/src/schemas/benefit.schema.ts`
- Create: `packages/plugins/polar/src/schemas/benefit-grant.schema.ts`
- Create: `packages/plugins/polar/src/schemas/processed-event.schema.ts`
- Create: `packages/plugins/polar/src/schemas/index.ts`

**Key Decisions / Notes:**

- All schemas: `@Schema({ versioning: false, i18n: false, visible: false })`
- `PolarCustomer`: `polarCustomerId` (unique), `email`, `name`, `userId` (Magnet user link via Polar `externalId`), `metadata`, `createdAt`
- `PolarProduct`: `polarProductId` (unique), `name`, `description`, `isRecurring`, `isArchived`, `organizationId`, `metadata`, `updatedAt`
- `PolarSubscription`: `polarSubscriptionId` (unique), `customerId`, `productId`, `status` (active/canceled/past_due/trialing/incomplete/unpaid), `amount`, `currency`, `recurringInterval`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `startedAt`, `endedAt`, `updatedAt`
- `PolarOrder`: `polarOrderId` (unique), `customerId`, `productId`, `subscriptionId` (optional), `status` (paid/refunded/pending), `totalAmount`, `currency`, `billingReason`, `createdAt`
- `PolarBenefit`: `polarBenefitId` (unique), `type` (text field — license_keys, downloadables, discord, custom, etc.), `description`, `organizationId`, `productId`, `createdAt`
- `PolarBenefitGrant`: `polarBenefitGrantId` (unique), `benefitId`, `customerId`, `subscriptionId` (optional), `isGranted`, `isRevoked`, `grantedAt`, `revokedAt`
- `PolarProcessedEvent`: `polarEventId` (unique), `eventType`, `processedAt`
- Follow Stripe schema patterns exactly (imports from `@magnet-cms/common`, `@Field.Text`, `@Field.Email`, `@Field.Date`, etc.)

**Definition of Done:**

- [ ] All 7 schema classes export correctly from `schemas/index.ts`
- [ ] Field types match Polar API response shapes
- [ ] No diagnostics errors
- [ ] All schemas use `{ versioning: false, i18n: false, visible: false }`

**Verify:**

- `bun run check-types` from monorepo root

---

### Task 3: Customer & Product Services

**Objective:** Create services for managing Polar customer and product records synced from webhooks.

**Dependencies:** Task 1, Task 2

**Files:**

- Create: `packages/plugins/polar/src/services/customer.service.ts`
- Create: `packages/plugins/polar/src/services/product.service.ts`
- Create: `packages/plugins/polar/src/services/index.ts`

**Key Decisions / Notes:**

- Follow `packages/plugins/stripe/src/services/customer.service.ts` pattern
- `PolarCustomerService`:
  - `upsertFromWebhook(data)` — upsert from webhook customer payload (Polar sends full customer object in webhook events)
  - `deleteByPolarId(polarCustomerId)` — delete local record
  - `findByUserId(userId)` — find by Magnet user ID
  - `findByPolarId(polarCustomerId)` — find by Polar ID
  - `findAll()` — list all customers
  - `linkToUser(polarCustomerId, userId)` — link Polar customer to Magnet user
- `PolarProductService`:
  - `syncProduct(data)` — upsert from webhook product payload
  - `deleteProduct(polarProductId)` — delete local record
  - `findActiveProducts()` — list non-archived products
  - `findAllProducts()` — list all products
- Unlike Stripe, Polar doesn't have a separate Price entity — prices are embedded in the product. Store product-level info only.

**Definition of Done:**

- [ ] Both services compile and follow the Stripe service patterns
- [ ] All CRUD methods match the Stripe equivalents adapted for Polar's data model
- [ ] No `any` types
- [ ] No diagnostics errors

**Verify:**

- `bun run check-types` from monorepo root

---

### Task 4: Subscription & Order Services

**Objective:** Create services for managing subscriptions and orders synced from Polar webhooks.

**Dependencies:** Task 1, Task 2

**Files:**

- Create: `packages/plugins/polar/src/services/subscription.service.ts`
- Create: `packages/plugins/polar/src/services/order.service.ts`

**Key Decisions / Notes:**

- `PolarSubscriptionService`:
  - `syncSubscription(data)` — upsert from webhook subscription payload
  - `deleteByPolarId(polarSubscriptionId)` — delete local record
  - `findActiveByCustomerId(customerId)` — find active subscription
  - `findAll()` — list all subscriptions
  - `cancel(polarSubscriptionId)` — cancel via Polar SDK API. **NOTE:** Verify exact method name from SDK types — could be `polar.subscriptions.cancel({ id })`, `polar.subscriptions.revoke()`, or an update with `cancelAtPeriodEnd: true`. If the SDK uses cancel-at-period-end semantics, the subscription status should remain `active` until the period ends, and `cancelAtPeriodEnd` should be set to `true`.
  - Subscription status comes directly from Polar: active, canceled, past_due, trialing, incomplete, unpaid
- `PolarOrderService`:
  - `syncOrder(data)` — upsert from webhook order payload (order.created, order.paid, order.updated)
  - `findAll()` — list all orders
  - `findByCustomerId(customerId)` — orders for a customer
  - Polar orders have `totalAmount`, `currency`, `billingReason`, `subscriptionId` (nullable)

**Definition of Done:**

- [ ] Both services compile and follow Stripe patterns adapted for Polar model
- [ ] `cancel()` method calls Polar SDK (not local-only)
- [ ] No diagnostics errors

**Verify:**

- `bun run check-types` from monorepo root

---

### Task 5: Webhook Controller & Service

**Objective:** Create the webhook controller for receiving Polar events and the webhook service for idempotent event processing.

**Dependencies:** Task 1, Task 2, Task 3, Task 4

**Files:**

- Create: `packages/plugins/polar/src/polar-webhook.controller.ts`
- Create: `packages/plugins/polar/src/polar-webhook.service.ts`

**Key Decisions / Notes:**

- **Controller** at `@Controller('polar/webhooks')`:
  - `@Post()` endpoint receives webhook
  - Verifies rawBody available via `polarService.verifyRawBodyAvailable(req)`
  - Calls `validateEvent(req.rawBody.toString(), headers, webhookSecret)` from `@polar-sh/sdk/webhooks` — **NOTE:** Verify the exact import path and function signature from `node_modules/@polar-sh/sdk` types before implementing. Polar likely uses Svix under the hood, so the controller may need to pass all Svix headers (`webhook-id`, `webhook-timestamp`, `webhook-signature`) as a headers object rather than a single header.
  - Passes verified event to webhook service
  - Returns `{ received: true }` with `@HttpCode(200)`
  - Import: `import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks'`
- **Webhook Service** follows `packages/plugins/stripe/src/stripe-webhook.service.ts` pattern:
  - Idempotency via `PolarProcessedEvent` schema
  - `processEvent(event)` — check idempotency, dispatch, record
  - `dispatchEvent(event)` — switch on event type:
    - `subscription.created` / `subscription.updated` → `subscriptionService.syncSubscription(event.data)`
    - `subscription.canceled` → `subscriptionService.syncSubscription(event.data)` (status will be 'canceled')
    - `order.created` / `order.paid` / `order.updated` → `orderService.syncOrder(event.data)`
    - `customer.created` / `customer.updated` → `customerService.upsertFromWebhook(event.data)`
    - `product.created` / `product.updated` → `productService.syncProduct(event.data)`
    - `benefit.created` / `benefit.updated` → `benefitService.syncBenefit(event.data)`
    - `benefit_grant.created` / `benefit_grant.updated` / `benefit_grant.revoked` → `benefitService.syncBenefitGrant(event.data)`
    - Default: log unhandled event type
  - Optional `EmailService` injection for payment receipt emails (same as Stripe)

**Definition of Done:**

- [ ] Webhook controller verifies raw body and calls `validateEvent()`
- [ ] Webhook service processes events idempotently
- [ ] All known Polar event types dispatched to correct services (including benefit.created/updated)
- [ ] Unhandled events logged gracefully
- [ ] No diagnostics errors

**Verify:**

- `bun run check-types` from monorepo root

---

### Task 6: Checkout & Portal Services

**Objective:** Create services for creating Polar checkout sessions and customer portal sessions.

**Dependencies:** Task 1, Task 3

**Files:**

- Create: `packages/plugins/polar/src/services/checkout.service.ts`
- Create: `packages/plugins/polar/src/services/portal.service.ts`

**Key Decisions / Notes:**

- `PolarCheckoutService`:
  - `createCheckoutSession(dto: CreateCheckoutDto)` → calls `polar.checkouts.create({ productId, successUrl, ... })`
  - DTO uses `productId` (not `productPriceId`) since Polar products embed prices directly. If the SDK requires a specific price ID from the product's `prices[]` array, verify from SDK types and adjust DTO accordingly.
  - Returns `SessionResponse { sessionId, url }`
  - Includes `customerEmail`, `metadata` from DTO
- `PolarPortalService`:
  - `createPortalSession(dto: CreatePortalDto)` → calls `polar.customerSessions.create({ customerId, returnUrl })` — **NOTE:** Verify exact SDK resource path and return type from `@polar-sh/sdk` types before implementing. Return field may be `customerPortalUrl` or `url`.
  - If `userId` provided instead of `customerId`, look up via `PolarCustomerService`
  - Returns `SessionResponse { sessionId, url }`
- Follow `packages/plugins/stripe/src/services/checkout.service.ts` and `portal.service.ts` patterns

**Definition of Done:**

- [ ] Checkout creates session via Polar SDK and returns session ID + URL
- [ ] Portal creates customer session and returns portal URL
- [ ] Portal falls back to userId lookup when customerId not provided
- [ ] Proper error handling with `HttpException`
- [ ] No diagnostics errors

**Verify:**

- `bun run check-types` from monorepo root

---

### Task 7: Access Service & Benefit Service

**Objective:** Create the access service for resolving subscription status and feature flags, and the benefit service for syncing benefit grants.

**Dependencies:** Task 1, Task 2, Task 3, Task 4

**Files:**

- Create: `packages/plugins/polar/src/services/access.service.ts`
- Create: `packages/plugins/polar/src/services/benefit.service.ts`

**Key Decisions / Notes:**

- `PolarAccessService`:
  - `getAccess(userId)` → returns `SubscriptionAccessResponse`
  - Resolves: customer → active subscription → product → plan name → feature flags from config
  - Follows `packages/plugins/stripe/src/services/access.service.ts` exactly
  - Uses `pluginConfig.features` map (same structure as Stripe)
- `PolarBenefitService`:
  - `syncBenefit(data)` — upsert benefit from webhook
  - `syncBenefitGrant(data)` — upsert benefit grant from webhook (handles created, updated, revoked)
  - `findGrantsByCustomerId(customerId)` — list active benefit grants
  - `findAll()` — list all benefits
  - `findGrantsAll()` — list all benefit grants

**Definition of Done:**

- [ ] Access service resolves full subscription access chain (customer → subscription → product → features)
- [ ] Benefit service handles grant lifecycle (created, updated, revoked)
- [ ] Feature flags resolution uses case-insensitive plan name matching
- [ ] No diagnostics errors

**Verify:**

- `bun run check-types` from monorepo root

---

### Task 8: Metrics Service & API Controller

**Objective:** Create the metrics service using Polar's analytics API and the API controller with all public and admin endpoints.

**Dependencies:** Task 1-7

**Files:**

- Create: `packages/plugins/polar/src/services/metrics.service.ts`
- Create: `packages/plugins/polar/src/polar-api.controller.ts`

**Key Decisions / Notes:**

- `PolarMetricsService`:
  - `getMetrics()` → calls `polar.metrics.get({ startDate, endDate, interval: 'month' })` for the last 12 months
  - Returns `PolarMetricsResponse` with: MRR, revenue this month, active subscriptions, churn rate, revenue by month, recent orders
  - Falls back to local DB computation if SDK call fails
  - Also counts active subscriptions from local DB as a cross-check
- `PolarApiController` at `@Controller('polar')`:
  - **Public endpoints:**
    - `POST /polar/checkout` — create checkout session
    - `GET /polar/products` — list active products
    - `GET /polar/subscription/:userId` — get user's subscription
    - `GET /polar/access/:userId` — get access + features (uses `@RestrictedRoute()`)
  - **Admin endpoints (all `@RestrictedRoute()`):**
    - `GET /polar/admin/metrics` — dashboard metrics
    - `GET /polar/admin/customers` — list customers
    - `GET /polar/admin/subscriptions` — list subscriptions
    - `POST /polar/admin/subscriptions/:id/cancel` — cancel subscription
    - `GET /polar/admin/products` — list all products
    - `POST /polar/admin/sync-products` — sync products from Polar API
    - `GET /polar/admin/orders` — list orders
    - `GET /polar/admin/benefits` — list benefits
    - `GET /polar/admin/benefit-grants` — list benefit grants

**Definition of Done:**

- [ ] Metrics service returns complete dashboard data using Polar API
- [ ] API controller has all public and admin endpoints matching Stripe plugin structure
- [ ] Admin endpoints use `@RestrictedRoute()`
- [ ] No diagnostics errors

**Verify:**

- `bun run check-types` from monorepo root

---

### Task 9: Module, Plugin & Package Configuration

**Objective:** Wire everything together: NestJS module, Plugin decorator, package.json, tsup, vite configs, and export structure.

**Dependencies:** Task 1-8

**Files:**

- Modify: `packages/plugins/polar/src/polar.module.ts` (overwrite stub)
- Modify: `packages/plugins/polar/src/plugin.ts` (overwrite stub)
- Modify: `packages/plugins/polar/src/index.ts` (overwrite stub)
- Create: `packages/plugins/polar/src/backend/index.ts`
- Modify: `packages/plugins/polar/package.json`
- Modify: `packages/plugins/polar/tsup.config.ts`
- Create: `packages/plugins/polar/vite.config.ts`

**Key Decisions / Notes:**

- `PolarModule`:
  - `imports`: `DatabaseModule.forFeature()` for all 7 schemas
  - `controllers`: `PolarApiController`, `PolarWebhookController`
  - `providers`: all 9 services + `PolarWebhookService`
  - `exports`: all domain services (not webhook service, not metrics)
- `PolarPlugin` — `@Plugin` decorator with:
  - `name: 'polar'`, `version: '0.1.0'`, `module: PolarModule`
  - `frontend.routes` and `frontend.sidebar` matching Stripe structure but for Polar pages
  - Sidebar icon: `Zap` (Polar's branding) with sub-items for Dashboard, Customers, Products, Subscriptions, Orders, Benefits
- `package.json`:
  - Add `@polar-sh/sdk` as peerDependency and devDependency
  - Add frontend deps: `@magnet-cms/admin`, `@magnet-cms/ui`, `@magnet-cms/utils`, `react`, `react-router-dom`, `lucide-react`, `recharts`, `@vitejs/plugin-react`, `vite`
  - Add `./backend` and `./frontend` export paths (matching Stripe)
  - Set `magnet.frontend: true`
- `tsup.config.ts`: Add `src/backend/index.ts` entry, externalize `@polar-sh/sdk`
- `vite.config.ts`: Copy from Stripe, change `MagnetPluginStripe` → `MagnetPluginPolar`
- Export structure in `index.ts` and `backend/index.ts` matching Stripe exactly

**Definition of Done:**

- [ ] `bun install` succeeds with new dependencies
- [ ] `bun run check-types` passes
- [ ] `bun run build --filter=@magnet-cms/plugin-polar` succeeds (both tsup and vite)
- [ ] Package exports resolve correctly for `.`, `./backend`, and `./frontend`
- [ ] `package.json` exports `./frontend` uses `./src/admin/index.ts` (not a dist path) matching Stripe pattern
- [ ] Post-build check: `ls packages/plugins/polar/dist/` confirms `index.js`, `backend/index.js`, and `frontend/bundle.iife.js` exist

**Verify:**

- `bun install && bun run check-types && bun run build --filter=@magnet-cms/plugin-polar && ls packages/plugins/polar/dist/index.js packages/plugins/polar/dist/backend/index.js packages/plugins/polar/dist/frontend/bundle.iife.js`

---

### Task 10: Admin Frontend — Dashboard & Metrics Components

**Objective:** Create the admin dashboard page and shared metrics components (subscription metrics cards, revenue chart, recent orders).

**Dependencies:** Task 9

**Files:**

- Create: `packages/plugins/polar/src/admin/index.ts`
- Create: `packages/plugins/polar/src/admin/pages/polar-dashboard.tsx`
- Create: `packages/plugins/polar/src/admin/components/subscription-metrics.tsx`
- Create: `packages/plugins/polar/src/admin/components/revenue-chart.tsx`
- Create: `packages/plugins/polar/src/admin/components/recent-orders.tsx`

**Key Decisions / Notes:**

- `admin/index.ts`: Self-registration on `window.__MAGNET_PLUGINS__` — copy Stripe's pattern, change plugin name to `polar`
- Dashboard page: Fetches `/polar/admin/metrics`, renders SubscriptionMetrics cards + RevenueChart + RecentOrders
- Components are near-copies of Stripe's with naming changes:
  - `SubscriptionMetrics` — 4 cards: MRR, Revenue This Month, Active Subscriptions, Churn Rate
  - `RevenueChart` — recharts BarChart for last 12 months
  - `RecentOrders` — DataTable with order ID, amount, status, customer email (replaces RecentPayments)
- Uses `useAdapter()` from `@magnet-cms/admin` for API calls
- Uses `@magnet-cms/ui/components` for Card, Skeleton, DataTable, Badge, etc.

**Definition of Done:**

- [ ] Dashboard page renders with loading skeleton and populated state
- [ ] All 3 components render correctly with proper types
- [ ] Frontend self-registers on `window.__MAGNET_PLUGINS__`
- [ ] No TypeScript errors

**Verify:**

- `bun run check-types` and `bun run build --filter=@magnet-cms/plugin-polar`

---

### Task 11: Admin Frontend — Entity Pages

**Objective:** Create admin pages for Customers, Products, Subscriptions, Orders, and Benefits.

**Dependencies:** Task 10

**Files:**

- Create: `packages/plugins/polar/src/admin/pages/customers.tsx`
- Create: `packages/plugins/polar/src/admin/pages/products.tsx`
- Create: `packages/plugins/polar/src/admin/pages/subscriptions.tsx`
- Create: `packages/plugins/polar/src/admin/pages/orders.tsx`
- Create: `packages/plugins/polar/src/admin/pages/benefits.tsx`

**Key Decisions / Notes:**

- Each page follows the exact same pattern as Stripe's pages:
  - Fetch data from `/polar/admin/<entity>` endpoint
  - DataTable with search/filter, pagination
  - Loading skeleton state
  - Action buttons where applicable (e.g., Cancel subscription, Sync products)
- **Customers:** Name, Email, User ID, Created — with Polar dashboard link
- **Products:** Name, Description, Recurring, Status (Active/Archived) — with "Sync from Polar" button
- **Subscriptions:** Customer, Product, Status, Period, Amount — with Cancel action
- **Orders:** Order ID, Amount, Status, Customer, Date — no external link (Polar doesn't expose order URLs in SDK)
- **Benefits:** Name, Type, Description, Product — list of available benefits and grants
- Links to Polar dashboard use `https://dashboard.polar.sh/` base URL

**Definition of Done:**

- [ ] All 5 entity pages render with loading states and data tables
- [ ] Search/filter and pagination work on each page
- [ ] Subscription cancel action calls admin API
- [ ] Product sync action calls admin API
- [ ] No TypeScript errors
- [ ] Frontend bundle builds successfully

**Verify:**

- `bun run check-types` and `bun run build --filter=@magnet-cms/plugin-polar`

---

### Task 12: E2E Tests

**Objective:** Create E2E tests for the Polar plugin API endpoints, mirroring the Stripe E2E tests.

**Dependencies:** Task 8, Task 9

**Files:**

- Create: `apps/e2e/tests/api/polar.spec.ts`

**Key Decisions / Notes:**

- Follow `apps/e2e/tests/api/stripe.spec.ts` pattern exactly
- Tests gracefully skip if plugin not registered (check for 404)
- Test cases:
  - `GET /polar/products` — returns product list or 404 if not registered
  - `GET /polar/access/:userId` — returns no subscription for unknown user
  - `POST /polar/webhooks` — rejects requests without valid signature
  - `POST /polar/checkout` — rejects without required fields
- Import from `../../src/fixtures/base.fixture`

**Definition of Done:**

- [ ] E2E test file matches Stripe test structure
- [ ] Tests skip gracefully when plugin not registered
- [ ] Tests validate response shapes and error handling
- [ ] No diagnostics errors

**Verify:**

- `bun run check-types`

## Open Questions

None — all design decisions resolved.

### Deferred Ideas

- **Polar OAuth2 flows** — Allow users to connect their Polar account via OAuth2 instead of providing an access token
- **Usage-based metering** — Support Polar's meter-based billing for consumption pricing
- **Seat-based subscriptions** — Support Polar's seat-based subscription model
- **Discount management** — Sync and manage Polar discount codes
- **Benefit delivery** — Active delivery of license keys, file downloads, etc. through the admin UI
