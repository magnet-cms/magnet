# Plan 009: Admin Layout Migration

**Status:** Proposed
**Priority:** High
**Estimated Effort:** 4 weeks
**Depends on:** Plan 000 (Type Safety), Plan 002 (Admin Architecture), Plan 006 (API Keys UI), Plan 007 (Auth UI), Plan 008 (RBAC UI)

---

## Summary

Migrate the new admin layout from `plans/admin` and `plans/ui` into the Magnet packages, replacing the current admin implementation with the redesigned React Router 7 based admin.

---

## Source Layout Structure

### plans/admin (Application)
```
app/
├── features/
│   ├── access-control/       # RBAC UI
│   ├── api-keys/            # API key management
│   ├── auth/                # Login, register, profile setup
│   ├── content-manager/     # Schema CRUD
│   ├── dashboard/           # Home dashboard
│   ├── media-library/       # Media management
│   ├── notifications/       # Notification drawer
│   ├── playground/          # Schema builder
│   ├── settings/            # Settings pages
│   ├── shared/              # Shared components
│   └── users/               # User management
├── layouts/
│   └── AuthedLayout.tsx     # Main authenticated layout
├── routes/                  # React Router routes
└── routes.ts               # Route definitions
```

### plans/ui (Component Library)
```
src/components/
├── atoms/                   # Basic UI elements (60+ components)
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   ├── sidebar.tsx
│   └── ...
├── molecules/               # Composed components
│   ├── hook-form/          # RHF field components
│   ├── collection-card/
│   ├── data-table/
│   ├── filter-bar/
│   ├── page-header/
│   └── ...
└── organisms/              # Complex components
    ├── app-layout/         # Main layout with sidebar
    └── data-table/         # Advanced data table
```

---

## Migration Strategy

### Phase 1: UI Package Migration

**Target: `packages/client/ui`**

1. **Copy atoms** from `plans/ui/src/components/atoms/`
2. **Copy molecules** from `plans/ui/src/components/molecules/`
3. **Copy organisms** from `plans/ui/src/components/organisms/`
4. **Update exports** in `packages/client/ui/src/index.ts`
5. **Verify Tailwind config** compatibility

### Phase 2: Admin App Restructure

**Target: `packages/client/admin`**

1. **Adopt React Router 7** (currently uses react-router-dom)
2. **Restructure to feature-based** architecture
3. **Migrate layouts** from `plans/admin/app/layouts/`
4. **Migrate routes** from `plans/admin/app/routes/`

### Phase 3: Feature Migration

Migrate each feature module:

1. **Dashboard** → `src/features/dashboard/`
2. **Content Manager** → `src/features/content-manager/`
3. **Media Library** → `src/features/media-library/`
4. **Settings** → `src/features/settings/`
5. **Users** → `src/features/users/`
6. **Access Control** → `src/features/access-control/`
7. **API Keys** → `src/features/api-keys/`
8. **Auth** → `src/features/auth/`
9. **Playground** → `src/features/playground/`
10. **Notifications** → `src/features/notifications/`

### Phase 4: Integration

1. **Connect to existing hooks** (useAuth, useDiscovery, etc.)
2. **Wire up API calls** via existing adapter pattern
3. **Integrate with plugin system**
4. **Update build configuration**

---

## Detailed File Mapping

### UI Components

| Source | Target |
|--------|--------|
| `plans/ui/src/components/atoms/*` | `packages/client/ui/src/components/atoms/*` |
| `plans/ui/src/components/molecules/*` | `packages/client/ui/src/components/molecules/*` |
| `plans/ui/src/components/organisms/*` | `packages/client/ui/src/components/organisms/*` |

### Admin Features

| Source | Target |
|--------|--------|
| `plans/admin/app/features/dashboard/` | `packages/client/admin/src/features/dashboard/` |
| `plans/admin/app/features/content-manager/` | `packages/client/admin/src/features/content-manager/` |
| `plans/admin/app/features/media-library/` | `packages/client/admin/src/features/media-library/` |
| `plans/admin/app/features/settings/` | `packages/client/admin/src/features/settings/` |
| `plans/admin/app/features/users/` | `packages/client/admin/src/features/users/` |
| `plans/admin/app/features/access-control/` | `packages/client/admin/src/features/access-control/` |
| `plans/admin/app/features/api-keys/` | `packages/client/admin/src/features/api-keys/` |
| `plans/admin/app/features/auth/` | `packages/client/admin/src/features/auth/` |
| `plans/admin/app/features/playground/` | `packages/client/admin/src/features/playground/` |
| `plans/admin/app/features/notifications/` | `packages/client/admin/src/features/notifications/` |

### Layouts

| Source | Target |
|--------|--------|
| `plans/admin/app/layouts/AuthedLayout.tsx` | `packages/client/admin/src/layouts/AuthedLayout.tsx` |
| `plans/admin/app/root.tsx` | `packages/client/admin/src/App.tsx` |

---

## New Directory Structure

### packages/client/ui
```
src/
├── components/
│   ├── atoms/
│   │   ├── accordion.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── button-group.tsx
│   │   ├── calendar.tsx
│   │   ├── card.tsx
│   │   ├── checkbox.tsx
│   │   ├── collapsible.tsx
│   │   ├── command.tsx
│   │   ├── dialog.tsx
│   │   ├── drawer.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── empty.tsx
│   │   ├── field.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── input-group.tsx
│   │   ├── label.tsx
│   │   ├── popover.tsx
│   │   ├── scroll-area.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   ├── sidebar.tsx
│   │   ├── skeleton.tsx
│   │   ├── spinner.tsx
│   │   ├── switch.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── textarea.tsx
│   │   ├── tooltip.tsx
│   │   └── index.ts
│   ├── molecules/
│   │   ├── hook-form/
│   │   │   ├── checkbox.tsx
│   │   │   ├── combobox.tsx
│   │   │   ├── date-picker.tsx
│   │   │   ├── file-upload.tsx
│   │   │   ├── multi-select.tsx
│   │   │   ├── radio-group.tsx
│   │   │   ├── select.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── text.tsx
│   │   │   ├── textarea.tsx
│   │   │   └── index.ts
│   │   ├── collection-card/
│   │   ├── filter-bar/
│   │   ├── form-drawer/
│   │   ├── page-header/
│   │   ├── stat-card/
│   │   ├── timeline-item/
│   │   └── index.ts
│   ├── organisms/
│   │   ├── app-layout/
│   │   │   ├── app-layout.tsx
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── nav-main.tsx
│   │   │   ├── nav-secondary.tsx
│   │   │   ├── nav-user.tsx
│   │   │   ├── site-header.tsx
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── data-table/
│   │   │   ├── data-table.tsx
│   │   │   ├── columns/
│   │   │   └── index.ts
│   │   └── index.ts
│   └── index.ts
├── lib/
│   └── utils.ts
└── index.ts
```

### packages/client/admin
```
src/
├── features/
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── DashboardHome.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   ├── CollectionCard.tsx
│   │   │   ├── MediaLibraryPreview.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   └── index.ts
│   ├── content-manager/
│   │   ├── components/
│   │   │   ├── ContentManagerListingPage.tsx
│   │   │   ├── SchemaFormPage.tsx
│   │   │   ├── RelationsAndMetadataPanel.tsx
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   └── index.ts
│   ├── media-library/
│   │   ├── components/
│   │   │   ├── MediaLibraryPage.tsx
│   │   │   ├── AssetCard.tsx
│   │   │   ├── AssetGrid.tsx
│   │   │   ├── FolderGrid.tsx
│   │   │   ├── MediaFilters.tsx
│   │   │   ├── MediaViewDrawer.tsx
│   │   │   ├── UploadAssetsDrawer.tsx
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   └── useMediaUpload.ts
│   │   └── index.ts
│   ├── users/
│   │   ├── components/
│   │   │   ├── UsersListingPage.tsx
│   │   │   ├── CreateUserDrawer.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── access-control/
│   │   ├── components/
│   │   │   ├── AccessControlListingPage.tsx
│   │   │   ├── AccessControlPage.tsx
│   │   │   ├── PermissionMatrix.tsx
│   │   │   ├── PermissionGroup.tsx
│   │   │   ├── PermissionAccordion.tsx
│   │   │   ├── PermissionItem.tsx
│   │   │   ├── RoleHeader.tsx
│   │   │   ├── InfoPanel.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── api-keys/
│   │   ├── components/
│   │   │   ├── ApiKeysListingPage.tsx
│   │   │   ├── CreateApiKeyDrawer.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── settings/
│   │   ├── components/
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── SettingsList.tsx
│   │   │   ├── ConfigurationForm.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── ActivityLogsPanel.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── auth/
│   │   ├── login/
│   │   ├── register/
│   │   ├── profile-setup/
│   │   ├── shared/
│   │   └── index.ts
│   ├── playground/
│   │   ├── components/
│   │   │   ├── PlaygroundPage.tsx
│   │   │   ├── BuilderView.tsx
│   │   │   ├── CodeView.tsx
│   │   │   ├── JsonView.tsx
│   │   │   ├── SchemaList.tsx
│   │   │   ├── FieldSettingsPanel.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── notifications/
│   │   ├── components/
│   │   │   ├── NotificationsDrawer.tsx
│   │   │   ├── NotificationItem.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   └── shared/
│       ├── components/
│       │   ├── PageHeader.tsx
│       │   └── index.ts
│       └── index.ts
├── layouts/
│   ├── AuthedLayout.tsx
│   └── index.ts
├── routes/
│   ├── index.tsx           # Route configuration
│   ├── dashboard.tsx
│   ├── content-manager.tsx
│   ├── media-library.tsx
│   ├── users.tsx
│   ├── access-control.tsx
│   ├── api-keys.tsx
│   ├── settings.tsx
│   └── ...
├── core/                   # Existing core (keep)
│   ├── adapters/
│   ├── provider/
│   ├── router/
│   ├── storage/
│   └── plugins/
├── hooks/                  # Existing hooks (keep/update)
├── contexts/               # Existing contexts (keep/update)
├── MagnetAdmin.tsx        # Main component (update)
├── App.tsx                # Dev app (update)
├── main.tsx               # Entry point
└── index.ts               # Library exports
```

---

## Integration Tasks

### 1. Sidebar Configuration

Update `AuthedLayout.tsx` to use dynamic sidebar config from discovery:

```typescript
// Build sidebar from discovered schemas
const sidebarConfig: SidebarConfig = {
  brandName: 'Magnet',
  navMain: [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
    {
      title: 'Content Manager',
      url: '/content-manager',
      icon: Layers,
      items: schemas.map((s) => ({
        title: s.displayName,
        url: `/content-manager/${s.apiName}`,
      })),
    },
    { title: 'Playground', url: '/playground', icon: FlaskConical },
    { title: 'Media Library', url: '/media-library', icon: Image },
  ],
  navSecondary: [
    { title: 'Users', url: '/users', icon: Users },
    { title: 'Access Control', url: '/access-control', icon: ShieldCheck },
    { title: 'API Keys', url: '/api-keys', icon: Key },
    { title: 'Settings', url: '/settings', icon: Settings },
  ],
  user: currentUser,
  onLogout: () => auth.logout(),
}
```

### 2. API Integration

Connect features to existing hooks:

```typescript
// Dashboard
const { data: stats } = useQuery(['stats'], fetchDashboardStats)
const { data: recentActivity } = useQuery(['activity'], fetchRecentActivity)

// Content Manager
const { schemas } = useDiscovery()
const { data, isLoading } = useContentList(schema, filters)

// Users
const { users, create, update, remove } = useUsers()

// Access Control (new)
const { roles, permissions, updatePermissions } = useRoles()

// API Keys (new)
const { apiKeys, create, revoke } = useApiKeys()
```

### 3. Form Builder Update

Update FormBuilder to use new hook-form components:

```typescript
// Use new RHF components from @repo/ui
import {
  RHFText,
  RHFTextarea,
  RHFSelect,
  RHFMultiSelect,
  RHFDatePicker,
  RHFSwitch,
  RHFFileUpload,
} from '@repo/ui/molecules/hook-form'
```

### 4. Route Configuration

```typescript
// src/routes/index.tsx
import { createBrowserRouter } from 'react-router-dom'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AuthedLayout />,
    children: [
      { index: true, element: <DashboardHome /> },
      { path: 'content-manager', element: <ContentManagerLayout />,
        children: [
          { path: ':schema', element: <ContentManagerListingPage /> },
          { path: ':schema/:id', element: <SchemaFormPage /> },
        ],
      },
      { path: 'media-library', element: <MediaLibraryPage /> },
      { path: 'users', element: <UsersListingPage /> },
      { path: 'access-control', element: <AccessControlListingPage /> },
      { path: 'access-control/:role', element: <AccessControlPage /> },
      { path: 'api-keys', element: <ApiKeysListingPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/:group', element: <SettingsPage /> },
      { path: 'playground', element: <PlaygroundPage /> },
    ],
  },
  {
    path: '/auth',
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'setup', element: <ProfileSetupPage /> },
    ],
  },
])
```

---

## Breaking Changes

### UI Package
- New component API (props may differ)
- New styling (Tailwind classes)
- Import paths change

### Admin Package
- Route structure changes
- Feature-based imports
- New layout system

### Migration Path
1. Release as major version bump
2. Provide migration guide
3. Deprecation warnings in current version

---

## Dependencies

### New Dependencies
```json
{
  "@radix-ui/react-accordion": "^1.x",
  "@radix-ui/react-avatar": "^1.x",
  "@radix-ui/react-checkbox": "^1.x",
  "@radix-ui/react-collapsible": "^1.x",
  "@radix-ui/react-dialog": "^1.x",
  "@radix-ui/react-dropdown-menu": "^1.x",
  "@radix-ui/react-popover": "^1.x",
  "@radix-ui/react-scroll-area": "^1.x",
  "@radix-ui/react-select": "^1.x",
  "@radix-ui/react-separator": "^1.x",
  "@radix-ui/react-slot": "^1.x",
  "@radix-ui/react-switch": "^1.x",
  "@radix-ui/react-tabs": "^1.x",
  "@radix-ui/react-tooltip": "^1.x",
  "class-variance-authority": "^0.7.x",
  "cmdk": "^0.2.x",
  "lucide-react": "^0.400.x",
  "react-router": "^7.x",
  "sonner": "^1.x",
  "vaul": "^0.9.x"
}
```

---

## Success Criteria

1. All UI components migrated and functional
2. All admin features working with API
3. Sidebar dynamically populated from discovery
4. Access control UI connected to RBAC API
5. API keys UI connected to API keys module
6. Form builder uses new RHF components
7. Plugin system continues to work
8. Standalone and embedded modes work
9. Build succeeds for both library and standalone
10. E2E tests pass
