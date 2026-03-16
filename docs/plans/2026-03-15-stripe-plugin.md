# Stripe Plugin Implementation Plan

Created: 2026-03-15
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Create `@magnet-cms/plugin-stripe` — a full Magnet CMS plugin for Stripe payments with schemas, webhook processing, checkout/portal API, admin dashboard, and user subscription access. Also scaffold `@magnet-cms/plugin-polar` as an empty shell.

**Architecture:** NestJS plugin module with `StripeModule.forRoot()` config pattern, 6 adapter-agnostic Magnet schemas (Customer, Product, Price, Subscription, Payment, ProcessedEvent), webhook controller with raw body signature verification, and a frontend bundle with 5 admin pages using `@magnet-cms/ui` Chart component.

**Tech Stack:** Stripe Node.js SDK (`stripe`), NestJS (backend), React + Vite IIFE bundle (admin UI), Recharts via `@magnet-cms/ui` Chart component.

## Scope

### In Scope

- Plugin package structure with backend + frontend
- 6 Magnet schemas (adapter-agnostic via @Schema/@Field decorators)
- Stripe SDK service wrapper with typed config
- Webhook endpoint with signature verification + idempotency (ProcessedEvent schema)
- Checkout session + Customer Portal API
- Product/price/customer/subscription sync via webhooks
- Admin dashboard (MRR, revenue chart, recent payments, subscription metrics)
- Admin CRUD pages for customers, products, subscriptions, payments
- Refund action from admin payments page
- User subscription access/feature flags endpoint
- Email integration for receipts and failed payment notifications
- Hybrid admin data: DB records + live Stripe API for real-time metrics
- Polar.sh plugin empty shell scaffold

### Out of Scope

- Stripe Connect / multi-tenant marketplace
- Stripe Tax / automatic tax calculation
- Subscription upgrade/downgrade proration logic (handled by Stripe Portal)
- Custom payment forms (Stripe Elements) — uses hosted Checkout
- Webhook retry queue with dead letter (use Stripe's built-in retry)
- Full integration E2E tests requiring real Stripe API keys (test mode fixtures used instead)

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Plugin registration pattern:** See `packages/plugins/content-builder/src/plugin.ts:16-45` — `@Plugin({ name, module, frontend })` decorator on a class. The `module` field points to a NestJS module that gets auto-imported.
- **Schema pattern:** Use `@Schema({ versioning: false, i18n: false, visible: false })` + `@Field.*` decorators from `@magnet-cms/common`. See `packages/core/src/modules/webhook/schemas/webhook.schema.ts` for a system schema example. For complex types (objects/arrays), use `@Prop({ type: Object })` or `@Prop({ type: [String] })` from `@magnet-cms/common`.
- **Module with schemas:** Use `DatabaseModule.forFeature(SchemaClass)` in module imports. See `packages/core/src/modules/webhook/webhook.module.ts:29-31`.
- **Frontend plugin entry:** Self-registering IIFE bundle pattern. See `packages/plugins/content-builder/src/frontend/index.ts` — manifest + component loaders pushed to `window.__MAGNET_PLUGINS__`.
- **Vite config for plugin frontend:** See `packages/plugins/content-builder/vite.config.ts` — IIFE format with externalized React/admin/UI deps.
- **Admin page imports:** Use `{ PageHeader, PageContent, useAdapter } from '@magnet-cms/admin'` (verified: `useAdapter()` exported from `packages/client/admin/src/core/provider/MagnetProvider.tsx:37` — returns `MagnetApiAdapter` with `.request(path)` method). Use `{ Card, Button, Badge, Table, ... } from '@magnet-cms/ui/components'` and `{ cn } from '@magnet-cms/ui/lib'`.
- **Recharts for charts:** `@magnet-cms/ui` exports `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent` — but NOT recharts primitives. Import `BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer` from `recharts` directly. Externalize `recharts` in vite.config.ts.
- **Admin-only routes:** Use `@RestrictedRoute()` from `@magnet-cms/core` (verified: used at `packages/core/src/modules/plugin/plugin.controller.ts:7` and `packages/plugins/content-builder/src/backend/playground.controller.ts:17`).
- **Plugin options injection:** `@InjectPluginOptions('stripe')` in services to access config passed via `PluginModule.forRoot({ plugins: [{ plugin: StripePlugin, options: {...} }] })`.
- **API controller prefix:** Controllers in plugin modules get standard NestJS routing. Use `@Controller('stripe')` for `/stripe/*` routes. The content-builder uses `@Controller('playground')`.
- **Raw body for webhooks:** NestJS 11 supports `{ rawBody: true }` in `NestFactory.create()`. Consumers must enable this. The webhook controller accesses raw body via `req.rawBody`.
- **Email sending:** `EmailService.send(to, subject, templateName, context)` from `@magnet-cms/core`. Inject it in the stripe module.
- **Gotchas:**
  - `setDatabaseAdapter('drizzle')` must be called before schema imports in consumer apps
  - Plugin frontend bundles must externalize all `@magnet-cms/*` packages
  - `@Prop({ type: Object })` works across both Mongoose and Drizzle adapters for JSON data

## Assumptions

- Stripe SDK (`stripe` npm package) v17+ with TypeScript support — all tasks depend on this
- Consumer apps enable `rawBody: true` in NestFactory.create — Task 4 (webhooks) depends on this
- EmailService is available globally via MagnetModule — Task 11 depends on this
- `@magnet-cms/ui` Chart component wraps Recharts — Tasks 8-10 depend on this
- Plugin module's schemas are auto-discovered when registered via `DatabaseModule.forFeature()` — Tasks 2-6 depend on this

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Raw body not enabled in consumer app | High | Webhook signature verification fails silently | Document requirement prominently; throw clear error if rawBody unavailable |
| Chart component API mismatch | Medium | Admin dashboard charts don't render | Check chart.tsx API first; fall back to direct Recharts if needed |
| Adapter-agnostic schemas missing JSON support | Low | Metadata fields don't persist correctly | Use `@Prop({ type: Object })` which is tested in webhook schema pattern |
| Stripe SDK version breaking changes | Low | Type mismatches in webhook event handling | Pin to `^17.0.0` in peerDependencies |

## Goal Verification

### Truths

1. Plugin registers with Magnet and appears in `GET /plugins` endpoint
2. Stripe schemas are created in database when module initializes
3. `POST /stripe/webhooks` verifies Stripe signatures and processes events idempotently
4. `POST /stripe/checkout` returns a valid Stripe Checkout session URL
5. `POST /stripe/portal` returns a valid Stripe Customer Portal URL
6. Admin dashboard renders revenue metrics and charts with real data
7. `GET /stripe/access/:userId` returns subscription status and feature flags

### Artifacts

1. `packages/plugins/stripe/src/plugin.ts` — @Plugin decorator with module + frontend manifest
2. `packages/plugins/stripe/src/schemas/*.schema.ts` — 6 schema files with adapter-agnostic decorators
3. `packages/plugins/stripe/src/stripe-webhook.controller.ts` — webhook endpoint with signature verification
4. `packages/plugins/stripe/src/services/checkout.service.ts` — checkout session creation
5. `packages/plugins/stripe/src/admin/pages/stripe-dashboard.tsx` — admin overview with charts
6. `packages/plugins/stripe/src/services/access.service.ts` — subscription status + feature flags

## Progress Tracking

- [x] Task 1: Package scaffolding + config types
- [x] Task 2: Stripe schemas (6 schemas)
- [x] Task 3: Core Stripe SDK service
- [x] Task 4: Webhook controller + service
- [x] Task 5: Sync services (customer, product, subscription)
- [x] Task 6: Checkout + Portal services + API controller
- [x] Task 7: Access/subscription status + feature flags
- [x] Task 8: Admin dashboard overview page
- [x] Task 9: Admin customers + subscriptions pages
- [x] Task 10: Admin products + payments pages (with refund)
- [x] Task 11: Email integration + plugin registration
- [x] Task 12: Polar.sh plugin scaffold
- [x] Task 13: E2E tests for Stripe plugin API + admin

**Total Tasks:** 13 | **Completed:** 13 | **Remaining:** 0

## Implementation Tasks

### Task 1: Package Scaffolding + Config Types

**Objective:** Create the `@magnet-cms/plugin-stripe` package with proper monorepo integration, TypeScript configuration, build setup (tsup + vite), and typed plugin configuration interface.

**Dependencies:** None

**Files:**

- Create: `packages/plugins/stripe/package.json`
- Create: `packages/plugins/stripe/tsconfig.json`
- Create: `packages/plugins/stripe/tsup.config.ts`
- Create: `packages/plugins/stripe/vite.config.ts`
- Create: `packages/plugins/stripe/src/index.ts`
- Create: `packages/plugins/stripe/src/types.ts`

**Key Decisions / Notes:**

- Follow `packages/plugins/content-builder/package.json` structure exactly — dual exports (`.` for plugin, `./backend` for backend, `./frontend` for frontend source)
- `stripe` as peerDependency, `@magnet-cms/*` and `@nestjs/common` as devDependencies + peerDependencies
- Config interface: `StripePluginConfig` with `secretKey`, `webhookSecret`, `publishableKey`, `syncProducts`, `portalEnabled`, `currency`, `features` (plan→feature[] map)
- Vite config: IIFE format with same externals as content-builder (`vite.config.ts:28-55`). Additionally externalize `recharts` with `globals: { recharts: 'Recharts' }` since admin chart pages import recharts primitives directly.
- Add `recharts` as a devDependency + peerDependency
- Add `"magnet": { "type": "plugin", "backend": true, "frontend": true }` to package.json

**Definition of Done:**

- [ ] `bun install` succeeds with new package
- [ ] `bun run check-types` passes across monorepo
- [ ] Package exports are properly configured

**Verify:**

- `cd packages/plugins/stripe && bun run build`
- `bun run check-types`

---

### Task 2: Stripe Schemas (6 Schemas)

**Objective:** Create all 6 adapter-agnostic Magnet schemas: StripeCustomer, StripeProduct, StripePrice, StripeSubscription, StripePayment, StripeProcessedEvent.

**Dependencies:** Task 1

**Files:**

- Create: `packages/plugins/stripe/src/schemas/customer.schema.ts`
- Create: `packages/plugins/stripe/src/schemas/product.schema.ts`
- Create: `packages/plugins/stripe/src/schemas/price.schema.ts`
- Create: `packages/plugins/stripe/src/schemas/subscription.schema.ts`
- Create: `packages/plugins/stripe/src/schemas/payment.schema.ts`
- Create: `packages/plugins/stripe/src/schemas/processed-event.schema.ts`
- Create: `packages/plugins/stripe/src/schemas/index.ts`

**Key Decisions / Notes:**

- All schemas use `@Schema({ versioning: false, i18n: false, visible: false })` — they're system schemas with dedicated admin pages
- Follow the webhook schema pattern at `packages/core/src/modules/webhook/schemas/webhook.schema.ts`
- Use `@Field.Text()` for Stripe IDs, `@Field.Number()` for amounts (store in cents), `@Field.Date()` for timestamps
- Use `@Prop({ type: Object })` for metadata fields, `@Prop({ type: [String] })` for images arrays
- Prefix class names with `Stripe` to avoid conflicts (e.g., `StripeCustomer`, not `Customer`)
- StripeProcessedEvent: `stripeEventId` (unique, indexed), `eventType`, `processedAt`

**Definition of Done:**

- [ ] All 6 schemas compile with `bun run check-types`
- [ ] Schemas use only `@magnet-cms/common` imports (adapter-agnostic)
- [ ] No `any` types used anywhere

**Verify:**

- `bun run check-types`

---

### Task 3: Core Stripe SDK Service

**Objective:** Create `StripeService` — a thin wrapper around the Stripe SDK that initializes from plugin options and provides typed access to the Stripe client.

**Dependencies:** Task 1

**Files:**

- Create: `packages/plugins/stripe/src/stripe.service.ts`

**Key Decisions / Notes:**

- Inject config via `@InjectPluginOptions('stripe')` — see `packages/core/src/modules/plugin/decorators/inject-plugin-options.decorator.ts:20`
- Initialize `new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' })` in `onModuleInit`
- Expose `get client(): Stripe` for other services to use
- Throw clear error if `secretKey` is missing during init
- Add `verifyRawBodyAvailable(req: Request)` helper method that throws a descriptive error if `req.rawBody` is undefined — called by webhook controller on first request

**Definition of Done:**

- [ ] Service compiles without errors
- [ ] Config is typed with `StripePluginConfig` (no `any`)
- [ ] Clear error thrown for missing config
- [ ] `verifyRawBodyAvailable` throws descriptive error when rawBody not available

**Verify:**

- `bun run check-types`

---

### Task 4: Webhook Controller + Service

**Objective:** Create the webhook endpoint that verifies Stripe signatures, checks idempotency, and dispatches events to sync services.

**Dependencies:** Task 2, Task 3

**Files:**

- Create: `packages/plugins/stripe/src/stripe-webhook.controller.ts`
- Create: `packages/plugins/stripe/src/stripe-webhook.service.ts`

**Key Decisions / Notes:**

- Controller: `@Controller('stripe/webhooks')` with a single `@Post()` endpoint
- Use `@Req()` to access `request.rawBody` for signature verification — NestJS 11 exposes this when `rawBody: true` is set in bootstrap
- `stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)` for verification
- Idempotency: check `StripeProcessedEvent` schema before processing. If event already processed, return 200 OK.
- Service dispatches to handler methods by event type (e.g., `handleCheckoutCompleted`, `handleSubscriptionUpdated`)
- Event types to handle: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`, `product.created/updated/deleted`, `price.created/updated/deleted`, `customer.created/updated/deleted`
- Handler methods are stubs in this task — actual sync logic in Task 5
- Return 200 OK to Stripe after processing (even if handler fails — log error, don't retry via HTTP)

**Definition of Done:**

- [ ] Controller compiles without errors
- [ ] Signature verification logic is correct
- [ ] Idempotency check prevents duplicate processing
- [ ] All expected event types have handler methods (can be empty stubs)

**Verify:**

- `bun run check-types`

---

### Task 5: Sync Services (Customer, Product, Subscription)

**Objective:** Create services that sync Stripe data to Magnet schemas — called by webhook service when events arrive.

**Dependencies:** Task 2, Task 3, Task 4

**Files:**

- Create: `packages/plugins/stripe/src/services/customer.service.ts`
- Create: `packages/plugins/stripe/src/services/product.service.ts`
- Create: `packages/plugins/stripe/src/services/subscription.service.ts`
- Create: `packages/plugins/stripe/src/services/index.ts`

**Key Decisions / Notes:**

- Each service injects its schema model via `@InjectModel(StripeCustomer)` etc. — use `getModelToken` pattern from `@magnet-cms/common`
- CustomerService: `upsertFromStripe(stripeCustomer)` — creates/updates StripeCustomer record
- ProductService: `syncProduct(stripeProduct)`, `syncPrice(stripePrice)` — upsert from Stripe objects
- SubscriptionService: `syncSubscription(stripeSubscription)` — upsert with status tracking
- All services should handle both create and update (upsert by Stripe ID)
- Wire up webhook service to call these sync methods for each event type

**Definition of Done:**

- [ ] All 3 services compile
- [ ] Webhook service dispatches to correct sync methods
- [ ] Upsert logic handles both create and update cases

**Verify:**

- `bun run check-types`

---

### Task 6: Checkout + Portal Services + API Controller

**Objective:** Create public API endpoints for creating Stripe Checkout sessions, Customer Portal sessions, listing products, and getting user subscriptions.

**Dependencies:** Task 2, Task 3, Task 5

**Files:**

- Create: `packages/plugins/stripe/src/services/checkout.service.ts`
- Create: `packages/plugins/stripe/src/services/portal.service.ts`
- Create: `packages/plugins/stripe/src/stripe-api.controller.ts`

**Key Decisions / Notes:**

- Controller: `@Controller('stripe')` — endpoints:
  - `POST /stripe/checkout` → create checkout session (accepts `priceId`, `successUrl`, `cancelUrl`, optional `userId`, `metadata`)
  - `POST /stripe/portal` → create portal session (accepts `customerId` or `userId`)
  - `GET /stripe/products` → list active products with their prices (from DB records)
  - `GET /stripe/subscription/:userId` → get user's active subscription
- CheckoutService: calls `stripe.checkout.sessions.create()` with proper config
- PortalService: calls `stripe.billingPortal.sessions.create()`
- For `GET /stripe/products`: query from synced DB records, not live Stripe API
- Auth: checkout/portal need user context; products listing can be public

**Definition of Done:**

- [ ] All endpoints compile
- [ ] Checkout creates valid session with correct parameters
- [ ] Portal creates session for given customer
- [ ] Products endpoint returns data from synced DB records

**Verify:**

- `bun run check-types`

---

### Task 7: Access/Subscription Status + Feature Flags

**Objective:** Create the user-facing subscription access endpoint that returns subscription status and feature flags per plan.

**Dependencies:** Task 2, Task 3, Task 5

**Files:**

- Create: `packages/plugins/stripe/src/services/access.service.ts`
- Modify: `packages/plugins/stripe/src/stripe-api.controller.ts`

**Key Decisions / Notes:**

- New endpoint: `GET /stripe/access/:userId`
- Returns: `{ hasActiveSubscription, plan, expiresAt, features }`
- AccessService: look up StripeCustomer by userId → find active StripeSubscription → resolve StripePrice → get product name as plan → map plan to features from plugin config
- Feature flags come from config: `{ features: { 'pro': ['unlimited-servers'], 'basic': ['5-servers'] } }`
- Handle edge cases: no customer record → `{ hasActiveSubscription: false, plan: null, ... }`

**Definition of Done:**

- [ ] Access endpoint returns correct subscription status
- [ ] Feature flags resolve from plan name to config features array
- [ ] Returns graceful default when no subscription exists

**Verify:**

- `bun run check-types`

---

### Task 8: Admin Dashboard Overview Page

**Objective:** Create the main Stripe admin dashboard page with MRR, revenue, subscription count, revenue chart, and recent payments.

**Dependencies:** Task 1, Task 6, Task 7

**Files:**

- Create: `packages/plugins/stripe/src/admin/pages/stripe-dashboard.tsx`
- Create: `packages/plugins/stripe/src/admin/components/revenue-chart.tsx`
- Create: `packages/plugins/stripe/src/admin/components/subscription-metrics.tsx`
- Create: `packages/plugins/stripe/src/admin/components/recent-payments.tsx`

**Key Decisions / Notes:**

- Uses `useAdapter()` from `@magnet-cms/admin` to fetch data from backend
- Hybrid data: fetch MRR/revenue from a new backend endpoint `GET /stripe/admin/metrics` that queries live Stripe API (`stripe.subscriptions.list`, `stripe.charges.list`) + DB records
- Revenue chart: import `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` from `@magnet-cms/ui/components`. Import `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `ResponsiveContainer` from `recharts` directly.
- Layout: stat cards at top (MRR, revenue, active subs, churn) → chart → recent payments table
- Add `GET /stripe/admin/metrics` endpoint to the API controller (admin-only, `@RestrictedRoute()`)

**Definition of Done:**

- [ ] Dashboard page renders with stat cards, chart, and payments table
- [ ] Metrics endpoint returns MRR calculated from active subscriptions
- [ ] Revenue chart shows last 12 months data

**Verify:**

- `bun run check-types`

---

### Task 9: Admin Customers + Subscriptions Pages

**Objective:** Create admin pages for managing Stripe customers and subscriptions with search, filter, and detail views.

**Dependencies:** Task 8

**Files:**

- Create: `packages/plugins/stripe/src/admin/pages/customers.tsx`
- Create: `packages/plugins/stripe/src/admin/pages/subscriptions.tsx`

**Key Decisions / Notes:**

- Customers page: table with search/filter, columns: name, email, subscription status, created. Each row links to Stripe Dashboard.
- Subscriptions page: table with filters (status, plan), columns: customer, plan, status, period, cancel status. Actions: cancel (via Stripe API).
- Both pages use `PageHeader` + `PageContent` from `@magnet-cms/admin`
- Data fetched via `useAdapter().request('/stripe/admin/customers')` etc.
- Add admin endpoints: `GET /stripe/admin/customers` (paginated), `GET /stripe/admin/subscriptions` (paginated, filterable), `POST /stripe/admin/subscriptions/:id/cancel`
- Modify: `packages/plugins/stripe/src/stripe-api.controller.ts` to add admin endpoints

**Definition of Done:**

- [ ] Customers page renders with search and table
- [ ] Subscriptions page renders with status filters
- [ ] Cancel subscription action calls Stripe API

**Verify:**

- `bun run check-types`

---

### Task 10: Admin Products + Payments Pages (with Refund)

**Objective:** Create admin pages for products/prices and payment history with refund capability.

**Dependencies:** Task 8

**Files:**

- Create: `packages/plugins/stripe/src/admin/pages/products.tsx`
- Create: `packages/plugins/stripe/src/admin/pages/payments.tsx`

**Key Decisions / Notes:**

- Products page: table of synced products with prices. "Sync from Stripe" button triggers `POST /stripe/admin/sync-products` endpoint that calls Stripe API to fetch all products/prices and upsert to DB.
- Payments page: table with filters (status: succeeded/failed/refunded). Refund action: `POST /stripe/admin/payments/:id/refund` calls `stripe.refunds.create()`.
- Add admin endpoints to controller:
  - `GET /stripe/admin/products` — list from DB
  - `POST /stripe/admin/sync-products` — fetch from Stripe + upsert
  - `GET /stripe/admin/payments` — list from DB (paginated)
  - `POST /stripe/admin/payments/:id/refund` — refund via Stripe API
- Modify: `packages/plugins/stripe/src/stripe-api.controller.ts`

**Definition of Done:**

- [ ] Products page renders with sync button
- [ ] Payments page renders with refund action
- [ ] Sync endpoint fetches from Stripe and upserts to DB
- [ ] Refund endpoint calls Stripe refund API

**Verify:**

- `bun run check-types`

---

### Task 11: Email Integration + Plugin Registration

**Objective:** Wire up email notifications for receipts and failed payments. Complete the @Plugin registration and StripeModule.forRoot() assembly.

**Dependencies:** Task 4, Task 5, Task 6, Task 7

**Files:**

- Create: `packages/plugins/stripe/src/plugin.ts`
- Create: `packages/plugins/stripe/src/stripe.module.ts`
- Create: `packages/plugins/stripe/src/admin/index.ts` (frontend entry)
- Modify: `packages/plugins/stripe/src/stripe-webhook.service.ts` — add email calls
- Modify: `packages/plugins/stripe/src/index.ts` — export plugin + backend

**Key Decisions / Notes:**

- Plugin class: `@Plugin({ name: 'stripe', module: StripeModule, frontend: { routes, sidebar } })`
- Frontend manifest: sidebar item with `CreditCard` lucide icon, routes for dashboard/customers/products/subscriptions/payments
- StripeModule.forRoot(): import `DatabaseModule.forFeature()` for all 6 schemas, register all services + controllers
- Email: in webhook service, on `invoice.paid` → `emailService.send(customerEmail, 'Payment Receipt', 'stripe-receipt', { amount, ... })`. On `invoice.payment_failed` → send to customer + admin.
- Note: Email templates are placeholder — they'll render via the template service. If no template exists, EmailService logs and skips.

**Definition of Done:**

- [ ] Plugin registers successfully with @Plugin decorator
- [ ] StripeModule.forRoot() assembles all providers/controllers/schemas
- [ ] Frontend entry self-registers on `window.__MAGNET_PLUGINS__`
- [ ] Receipt email triggered on invoice.paid
- [ ] Failed payment email triggered on invoice.payment_failed

**Verify:**

- `bun run check-types`
- `cd packages/plugins/stripe && bun run build`

---

### Task 12: Polar.sh Plugin Scaffold

**Objective:** Create an empty shell package for `@magnet-cms/plugin-polar` with minimal structure for future development.

**Dependencies:** None

**Files:**

- Create: `packages/plugins/polar/package.json`
- Create: `packages/plugins/polar/tsconfig.json`
- Create: `packages/plugins/polar/tsup.config.ts`
- Create: `packages/plugins/polar/src/index.ts`
- Create: `packages/plugins/polar/src/plugin.ts`
- Create: `packages/plugins/polar/src/polar.module.ts`
- Create: `packages/plugins/polar/src/polar.service.ts`

**Key Decisions / Notes:**

- Minimal files with TODO comments indicating where to add functionality
- Follow same package.json pattern as stripe plugin but simpler (no vite/frontend yet)
- Plugin registered with `@Plugin({ name: 'polar', module: PolarModule })` — no frontend manifest
- PolarService: empty injectable class with TODO comments
- PolarModule: basic NestJS module with PolarService as provider

**Definition of Done:**

- [ ] Package installs and compiles
- [ ] `bun run check-types` passes

**Verify:**

- `bun run check-types`

---

### Task 13: E2E Tests for Stripe Plugin API + Admin

**Objective:** Create E2E tests for the Stripe plugin's API endpoints and admin dashboard page using Playwright, with mocked Stripe responses (no real API keys needed).

**Dependencies:** Task 11 (plugin fully assembled)

**Files:**

- Create: `apps/e2e/tests/api/stripe.spec.ts`
- Create: `apps/e2e/tests/ui/stripe-dashboard.spec.ts`

**Key Decisions / Notes:**

- API tests: mock the Stripe SDK at the service level or use Stripe test-mode event fixtures
- Test webhook endpoint: `POST /stripe/webhooks` with a test-mode event payload (Stripe provides fixture payloads). Can skip signature verification in test mode or use a known test webhook secret.
- Test public endpoints: `GET /stripe/products` (returns synced data), `GET /stripe/access/:userId` (returns no-subscription default)
- UI test: verify the Stripe dashboard page renders at `/stripe` with expected elements (stat cards, chart container, payments table)
- Follow existing E2E patterns in `apps/e2e/tests/api/` and `apps/e2e/tests/ui/`
- The E2E test app must register the StripePlugin — may need a test fixture app or extend the existing e2e app

**Definition of Done:**

- [ ] API tests cover: webhook endpoint, products listing, access endpoint
- [ ] UI test verifies dashboard page renders correctly
- [ ] Tests pass with `bun run test:e2e --project=api` and `--project=ui`
- [ ] No real Stripe API keys required

**Verify:**

- `bun run test:e2e --project=api`
- `bun run test:e2e --project=ui`

---

## Open Questions

1. Should the Stripe plugin register email templates (e.g., `stripe-receipt.hbs`) or rely on consumers defining them? For now: the plugin will attempt to send emails but gracefully handle missing templates via EmailService's built-in fallback.

### Deferred Ideas

- **Stripe Connect** — multi-tenant marketplace support for SaaS platforms
- **Stripe Tax** — automatic tax calculation integration
- **Stripe Elements** — embedded payment forms for custom checkout UIs
- **Webhook retry queue** — dead letter queue for persistently failing events (Stripe already retries)
- **Usage-based billing** — metered subscription support via `stripe.subscriptionItems.createUsageRecord`
- **Coupon/promotion code management** — admin UI for managing Stripe coupons
