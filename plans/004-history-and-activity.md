# Plan 004: History & Activity System

**Status:** Proposed
**Priority:** High
**Estimated Effort:** 2 weeks
**Depends on:** Plan 000 (Type Safety), Plan 000b (Event System for activity logging)

---

## Summary

Enhance the versioning system and add comprehensive activity logging for audit trails.

---

## Current State Analysis

### What Exists (History/Versioning)

**History Schema:**
```typescript
class History {
  documentId: string
  versionId: string
  schemaName: string
  locale: string
  versionNumber: number
  status: 'draft' | 'published' | 'archived'
  data: Mixed  // Full document snapshot
  createdAt: Date
  createdBy: string
  notes?: string
}
```

**HistoryService Features:**
- `createVersion()` - Create versioned snapshots
- `findVersions()` / `findVersionsByLocale()`
- `findLatestVersion()`
- `publishVersion()` / `archiveVersion()`
- `cleanupOldVersions()` - Automatic cleanup based on `maxVersions`
- Settings integration (maxVersions, draftsEnabled, requireApproval)

**Endpoints:**
- `GET /history/versions/:documentId`
- `GET /history/version/:versionId`
- `POST /content/:schema/:documentId/restore`

### What's Missing

1. **Activity/Audit Logging** - No tracking of user actions
2. **Version Comparison** - No diff between versions
3. **Version Comments** - Notes exist but no threaded comments
4. **Approval Workflow** - Setting exists but not implemented
5. **Event Emission** - No events on version changes

---

## Proposed Enhancements

### 1. Activity Log Schema

```typescript
@Schema({ versioning: false, i18n: false })
export class Activity {
  @Prop({ required: true, index: true })
  action: ActivityAction  // create, update, delete, publish, restore, login, etc.

  @Prop({ required: true, index: true })
  entityType: string  // 'content', 'user', 'setting', 'media', 'auth'

  @Prop({ index: true })
  entityId?: string  // Document/User/Setting ID

  @Prop()
  entityName?: string  // Human-readable name (e.g., "Blog Post: Hello World")

  @Prop({ required: true, index: true })
  userId: string  // Who performed the action

  @Prop()
  userName?: string  // Denormalized for display

  @Prop({ type: Mixed })
  metadata?: Record<string, unknown>  // Additional context

  @Prop({ type: Mixed })
  changes?: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
    fields?: string[]  // Which fields changed
  }

  @Prop()
  ipAddress?: string

  @Prop()
  userAgent?: string

  @Prop({ required: true, default: () => new Date() })
  timestamp: Date
}

type ActivityAction =
  | 'content.create'
  | 'content.update'
  | 'content.delete'
  | 'content.publish'
  | 'content.unpublish'
  | 'content.restore'
  | 'user.login'
  | 'user.logout'
  | 'user.register'
  | 'user.update'
  | 'user.password_change'
  | 'setting.update'
  | 'media.upload'
  | 'media.delete'
  | 'apikey.create'
  | 'apikey.revoke'
```

### 2. ActivityService

```typescript
@Injectable()
export class ActivityService {
  constructor(
    @Inject(ACTIVITY_MODEL) private model: Model<Activity>,
    private request: REQUEST,
  ) {}

  /**
   * Log an activity
   */
  async log(activity: CreateActivityDto): Promise<Activity> {
    return this.model.create({
      ...activity,
      ipAddress: this.request.ip,
      userAgent: this.request.headers['user-agent'],
      timestamp: new Date(),
    })
  }

  /**
   * Get activities for an entity
   */
  async getByEntity(entityType: string, entityId: string): Promise<Activity[]> {
    return this.model
      .find({ entityType, entityId })
      .sort({ timestamp: -1 })
      .limit(100)
  }

  /**
   * Get activities by user
   */
  async getByUser(userId: string, options?: PaginationOptions): Promise<PaginatedResult<Activity>> {
    // ...
  }

  /**
   * Get recent activities (admin dashboard)
   */
  async getRecent(limit = 50): Promise<Activity[]> {
    return this.model
      .find()
      .sort({ timestamp: -1 })
      .limit(limit)
  }

  /**
   * Search activities
   */
  async search(query: ActivitySearchQuery): Promise<PaginatedResult<Activity>> {
    const filter: FilterQuery<Activity> = {}

    if (query.action) filter.action = query.action
    if (query.entityType) filter.entityType = query.entityType
    if (query.userId) filter.userId = query.userId
    if (query.from) filter.timestamp = { $gte: query.from }
    if (query.to) filter.timestamp = { ...filter.timestamp, $lte: query.to }

    return this.model.paginate(filter, query.pagination)
  }

  /**
   * Cleanup old activities
   */
  async cleanup(retentionDays: number): Promise<number> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - retentionDays)

    const result = await this.model.deleteMany({
      timestamp: { $lt: cutoff },
    })
    return result.deletedCount
  }
}
```

### 3. Activity Interceptor

```typescript
@Injectable()
export class ActivityInterceptor implements NestInterceptor {
  constructor(
    private activityService: ActivityService,
    @Inject(REQUEST) private request: Request,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const user = request.user
    const startTime = Date.now()

    return next.handle().pipe(
      tap(async (response) => {
        // Skip GET requests (read-only)
        if (request.method === 'GET') return

        const activity = this.buildActivity(request, response, user)
        if (activity) {
          await this.activityService.log(activity)
        }
      }),
      catchError((error) => {
        // Log failed attempts for security
        if (this.isSecurityRelevant(request)) {
          this.activityService.log({
            action: 'auth.failed',
            entityType: 'auth',
            userId: 'anonymous',
            metadata: {
              error: error.message,
              path: request.path,
            },
          })
        }
        throw error
      }),
    )
  }
}
```

### 4. Version Comparison

```typescript
// Add to HistoryService
async compareVersions(
  versionId1: string,
  versionId2: string,
): Promise<VersionDiff> {
  const [v1, v2] = await Promise.all([
    this.findVersionById(versionId1),
    this.findVersionById(versionId2),
  ])

  if (!v1 || !v2) {
    throw new NotFoundException('Version not found')
  }

  return {
    version1: { id: v1.versionId, number: v1.versionNumber, createdAt: v1.createdAt },
    version2: { id: v2.versionId, number: v2.versionNumber, createdAt: v2.createdAt },
    changes: this.computeDiff(v1.data, v2.data),
  }
}

private computeDiff(before: object, after: object): FieldChange[] {
  const changes: FieldChange[] = []
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])

  for (const key of allKeys) {
    const beforeVal = before[key]
    const afterVal = after[key]

    if (!isEqual(beforeVal, afterVal)) {
      changes.push({
        field: key,
        before: beforeVal,
        after: afterVal,
        type: this.getChangeType(beforeVal, afterVal),
      })
    }
  }

  return changes
}

interface FieldChange {
  field: string
  before: unknown
  after: unknown
  type: 'added' | 'removed' | 'modified'
}
```

### 5. Activity Settings

```typescript
@Settings({
  group: 'activity',
  label: 'Activity & Audit',
  icon: 'activity',
  order: 35,
})
export class ActivitySettings {
  @Setting.Boolean({ label: 'Enable Activity Logging' })
  enabled: boolean = true

  @Setting.Number({
    label: 'Retention Period (days)',
    description: 'How long to keep activity logs',
    min: 7,
    max: 365,
  })
  retentionDays: number = 90

  @Setting.Boolean({
    label: 'Log IP Addresses',
    description: 'Store IP addresses in activity logs',
  })
  logIpAddresses: boolean = true

  @Setting.Select({
    label: 'Log Level',
    options: ['minimal', 'standard', 'detailed'],
    description: 'Amount of detail to capture',
  })
  logLevel: string = 'standard'

  @Setting.Boolean({
    label: 'Track Field Changes',
    description: 'Store before/after values for content changes',
  })
  trackFieldChanges: boolean = true
}
```

---

## API Endpoints

### Activity API

```
GET    /api/activity                     # Get recent activities
GET    /api/activity/entity/:type/:id    # Get activities for entity
GET    /api/activity/user/:userId        # Get activities by user
GET    /api/activity/search              # Search with filters
DELETE /api/activity/cleanup             # Cleanup old activities (admin)
```

### History API (Enhanced)

```
GET    /api/history/versions/:documentId           # List versions
GET    /api/history/version/:versionId             # Get version
GET    /api/history/compare/:v1/:v2                # Compare versions (NEW)
POST   /api/history/version                        # Create version
PUT    /api/history/version/:versionId/publish     # Publish
PUT    /api/history/version/:versionId/archive     # Archive
DELETE /api/history/version/:versionId             # Delete
```

---

## File Changes Summary

### New Files
| Path | Description |
|------|-------------|
| `packages/core/src/modules/activity/activity.module.ts` | Activity module |
| `packages/core/src/modules/activity/activity.service.ts` | Activity service |
| `packages/core/src/modules/activity/activity.controller.ts` | Activity endpoints |
| `packages/core/src/modules/activity/schemas/activity.schema.ts` | Activity schema |
| `packages/core/src/modules/activity/activity.settings.ts` | Activity settings |
| `packages/core/src/modules/activity/interceptors/activity.interceptor.ts` | Auto-logging |

### Modified Files
| Path | Changes |
|------|---------|
| `packages/core/src/modules/history/history.service.ts` | Add `compareVersions()` |
| `packages/core/src/modules/history/history.controller.ts` | Add compare endpoint |
| `packages/core/src/magnet.module.ts` | Import ActivityModule |

---

## Admin UI Integration

### Activity Feed Component
- Real-time activity feed on dashboard
- Filter by entity type, user, date range
- Click to navigate to related entity

### Version Comparison View
- Side-by-side diff view
- Highlight added/removed/changed fields
- Rich text diff for content fields

---

## Success Criteria

1. All content CRUD operations are logged
2. Auth events (login, logout, password change) are logged
3. Setting changes are logged
4. Activities queryable by entity, user, time range
5. Version comparison shows field-level diffs
6. Automatic cleanup of old activities
7. Admin UI shows activity feed
