# Magnet CMS - Implementation Plans

This directory contains implementation plans for Magnet CMS features. Plans should be executed in the order specified below to respect dependencies.

---

## Execution Order

### Phase 0: Foundation (Critical - Must Complete First)

These plans establish the foundation that all other plans depend on.

| Plan | Title | Effort | Status | Description |
|------|-------|--------|--------|-------------|
| [000](./000-type-safety-remediation.md) | Type Safety Remediation | 2 weeks | ✅ Completed | Eliminate all `any` types, add type guards |
| [000a](./000a-error-handling-infrastructure.md) | Error Handling Infrastructure | 1 week | ✅ Completed | Typed error classes, error factories |
| [000b](./000b-event-system-foundation.md) | Event System Foundation | 1 week | ✅ Completed | Type-safe event emitter for modules |
| [000c](./000c-unified-adapter-contract.md) | Unified Adapter Contract | 2 weeks | ✅ Completed | Standardize adapter/model interfaces |

**Total Phase 0:** ~6 weeks

---

### Phase 1: Core Infrastructure

Build the core decorator and module systems.

| Plan | Title | Effort | Status | Dependencies |
|------|-------|--------|--------|--------------|
| [001](./001-schema-field-decorators.md) | Schema & Field Decorators | 4 weeks | ✅ Completed | 000 |
| [002](./002-admin-standalone-embeddable.md) | Admin Standalone/Embeddable | 3 weeks | ✅ Completed | 000 |
| [003](./003-users-and-settings.md) | Users & Settings | 3 weeks | Proposed | 000, 001 |

**Total Phase 1:** ~10 weeks (001 and 002 can run in parallel)

---

### Phase 2: Security & Access

Implement authentication and authorization features.

| Plan | Title | Effort | Status | Dependencies |
|------|-------|--------|--------|--------------|
| [007](./007-authentication-enhancements.md) | Auth Enhancements | 2 weeks | Proposed | 000, 000b, 003 |
| [008](./008-role-based-access-control.md) | RBAC | 3 weeks | Proposed | 000, 000b, 007 |
| [006](./006-api-keys.md) | API Keys | 1.5 weeks | Proposed | 000, 007, 008 |

**Total Phase 2:** ~6.5 weeks (sequential due to dependencies)

---

### Phase 3: Features

Add supporting features that use the event system.

| Plan | Title | Effort | Status | Dependencies |
|------|-------|--------|--------|--------------|
| [004](./004-history-and-activity.md) | History & Activity | 2 weeks | Proposed | 000, 000b |
| [005](./005-webhooks.md) | Webhooks | 2 weeks | Proposed | 000, 000b |
| [010](./010-logging-infrastructure.md) | Logging Infrastructure | 1 week | Proposed | 000 |

**Total Phase 3:** ~5 weeks (004, 005, 010 can run in parallel)

---

### Phase 4: UI Migration

Migrate the new admin UI after all backend features are complete.

| Plan | Title | Effort | Status | Dependencies |
|------|-------|--------|--------|--------------|
| [009](./009-admin-layout-migration.md) | Admin Layout Migration | 4 weeks | Proposed | 000, 002, 006, 007, 008 |

**Total Phase 4:** ~4 weeks

---

### Phase 5: Database Infrastructure (Optional)

Advanced database features for SQL adapters.

| Plan | Title | Effort | Status | Dependencies |
|------|-------|--------|--------|--------------|
| [011](./011-database-migrations.md) | Database Migrations | 3 weeks | Proposed | 000, 000c |

**Total Phase 5:** ~3 weeks (can run after Phase 0)

---

## Dependency Graph

```
                    ┌─────────────────────────────────────────┐
                    │         PHASE 0: FOUNDATION             │
                    │  000 Type Safety ──────────────────────┐│
                    │  000a Error Handling ──────────────────┤│
                    │  000b Event System ────────────────────┤│
                    │  000c Adapter Contract ────────────────┤│
                    └────────────────────────────────────────┼┘
                                      │                      │
              ┌───────────────────────┼──────────────────────┤
              │                       │                      │
              ▼                       ▼                      ▼
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│   PHASE 1: CORE         │  │   PHASE 3: FEATURES     │  │   PHASE 5: DATABASE     │
│                         │  │   (can run parallel)    │  │   (optional)            │
│  001 Field Decorators   │  │                         │  │                         │
│          │              │  │  004 History/Activity ◄─┤─ 000b  011 Migrations ◄───┤─ 000c
│          ▼              │  │  005 Webhooks ◄─────────┤─ 000b                      │
│  003 Users & Settings   │  │  010 Logging            │  │                         │
│          │              │  │                         │  └─────────────────────────┘
│  002 Admin Architecture │  └─────────────────────────┘
│          │              │
└──────────┼──────────────┘
           │
           ▼
┌─────────────────────────┐
│   PHASE 2: SECURITY     │
│                         │
│  007 Auth Enhancements ◄┼─ 003
│          │              │
│          ▼              │
│  008 RBAC ◄─────────────┼─ 000b
│          │              │
│          ▼              │
│  006 API Keys           │
│                         │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│   PHASE 4: UI           │
│                         │
│  009 Admin Migration ◄──┼─ 002, 006, 007, 008
│                         │
└─────────────────────────┘
```

---

## Quick Reference

### All Plans by Number

| # | Plan | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 000 | [Type Safety Remediation](./000-type-safety-remediation.md) | Critical | 2 weeks | ✅ Completed |
| 000a | [Error Handling Infrastructure](./000a-error-handling-infrastructure.md) | Critical | 1 week | ✅ Completed |
| 000b | [Event System Foundation](./000b-event-system-foundation.md) | Critical | 1 week | ✅ Completed |
| 000c | [Unified Adapter Contract](./000c-unified-adapter-contract.md) | Critical | 2 weeks | ✅ Completed |
| 001 | [Schema & Field Decorators](./001-schema-field-decorators.md) | High | 4 weeks | ✅ Completed |
| 002 | [Admin Standalone/Embeddable](./002-admin-standalone-embeddable.md) | High | 3 weeks | ✅ Completed |
| 003 | [Users & Settings](./003-users-and-settings.md) | High | 3 weeks | Proposed |
| 004 | [History & Activity](./004-history-and-activity.md) | High | 2 weeks | Proposed |
| 005 | [Webhooks](./005-webhooks.md) | Medium | 2 weeks | Proposed |
| 006 | [API Keys](./006-api-keys.md) | Medium | 1.5 weeks | Proposed |
| 007 | [Auth Enhancements](./007-authentication-enhancements.md) | High | 2 weeks | Proposed |
| 008 | [RBAC](./008-role-based-access-control.md) | High | 3 weeks | Proposed |
| 009 | [Admin Layout Migration](./009-admin-layout-migration.md) | High | 4 weeks | Proposed |
| 010 | [Logging Infrastructure](./010-logging-infrastructure.md) | Medium | 1 week | Proposed |
| 011 | [Database Migrations](./011-database-migrations.md) | High | 3 weeks | Proposed |

### Total Estimated Effort

- **Phase 0 (Foundation):** ~6 weeks
- **Phase 1 (Core):** ~10 weeks
- **Phase 2 (Security):** ~6.5 weeks
- **Phase 3 (Features):** ~5 weeks (parallel with Phase 2)
- **Phase 4 (UI):** ~4 weeks
- **Phase 5 (Database):** ~3 weeks (can run after Phase 0)

**Overall:** ~22-28 weeks with optimal parallelization

---

## Source Materials

The following directories contain ready-to-migrate code for Plan 009:

- `plans/admin/` - Complete admin application (80+ files)
- `plans/ui/` - Complete UI component library (60+ files)

---

## Contributing

When creating or updating plans:

1. **Use the template** - Follow the structure of existing plans
2. **Add dependencies** - Specify which plans must complete first
3. **Include type safety** - Add Type Safety Requirements section
4. **No `any` types** - All proposed code must be fully typed
5. **Update this README** - Add new plans to the execution order
