import type {
  EventName,
  EventPayload,
  FieldChange,
  FilterQuery,
  Model,
  SortQuery,
} from '@magnet-cms/common'
import { InjectModel, OnEvent } from '@magnet-cms/common'
import { Inject, Injectable, forwardRef } from '@nestjs/common'

import { ActivitySettings } from './activity.settings'
import { Activity } from './schemas/activity.schema'

import { MagnetLogger } from '~/modules/logging/logger.service'
import { SettingsService } from '~/modules/settings/settings.service'
import { UserService } from '~/modules/user/user.service'

export interface CreateActivityDto {
  action: EventName
  entityType: string
  entityId?: string
  entityName?: string
  userId: string
  userName?: string
  metadata?: Record<string, unknown>
  changes?: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
    fields?: string[]
  }
  ipAddress?: string
  userAgent?: string
}

export interface ActivitySearchQuery {
  action?: EventName
  entityType?: string
  entityId?: string
  userId?: string
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}

export interface PaginatedActivities {
  items: Activity[]
  total: number
  limit: number
  offset: number
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(Activity) private readonly activityModel: Model<Activity>,
    private readonly settingsService: SettingsService,
    private readonly logger: MagnetLogger,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {
    this.logger.setContext(ActivityService.name)
  }

  /**
   * Log an activity record.
   * Respects the `enabled` and `logIpAddresses` settings.
   * Called by @OnEvent handlers — never throws so callers are not affected.
   */
  async log(dto: CreateActivityDto): Promise<Activity | null> {
    try {
      const settings = await this.settingsService.get(ActivitySettings)

      if (!settings.enabled) {
        return null
      }

      const record: CreateActivityDto = { ...dto }

      if (!settings.logIpAddresses) {
        record.ipAddress = undefined
      }

      // Populate userName if not provided and userId is not 'system'
      if (!record.userName && record.userId && record.userId !== 'system') {
        try {
          const user = await this.userService.findOneById(record.userId)
          if (user) {
            record.userName = user.name
          }
        } catch {
          // Non-critical — proceed without userName
        }
      }

      return await this.activityModel.create({
        ...record,
        timestamp: new Date(),
      })
    } catch (error) {
      this.logger.warn(
        `Failed to log activity '${dto.action}': ${error instanceof Error ? error.message : String(error)}`,
      )
      return null
    }
  }

  // -------------------------------------------------------------------------
  // Content event handlers
  // -------------------------------------------------------------------------

  @OnEvent('content.created', { async: true })
  async onContentCreated(payload: EventPayload<'content.created'>): Promise<void> {
    await this.log({
      action: 'content.created',
      entityType: payload.schema,
      entityId: payload.documentId,
      userId: payload.userId ?? 'system',
      ipAddress: payload.ipAddress,
    })
  }

  @OnEvent('content.updated', { async: true })
  async onContentUpdated(payload: EventPayload<'content.updated'>): Promise<void> {
    const settings = await this.getSettings()
    const changes =
      settings.trackFieldChanges && payload.changes?.length
        ? this.mapFieldChanges(payload.changes)
        : undefined

    await this.log({
      action: 'content.updated',
      entityType: payload.schema,
      entityId: payload.documentId,
      userId: payload.userId ?? 'system',
      ipAddress: payload.ipAddress,
      changes,
    })
  }

  @OnEvent('content.deleted', { async: true })
  async onContentDeleted(payload: EventPayload<'content.deleted'>): Promise<void> {
    await this.log({
      action: 'content.deleted',
      entityType: payload.schema,
      entityId: payload.documentId,
      userId: payload.userId ?? 'system',
      ipAddress: payload.ipAddress,
    })
  }

  @OnEvent('content.published', { async: true })
  async onContentPublished(payload: EventPayload<'content.published'>): Promise<void> {
    await this.log({
      action: 'content.published',
      entityType: payload.schema,
      entityId: payload.documentId,
      userId: payload.userId ?? 'system',
      ipAddress: payload.ipAddress,
    })
  }

  @OnEvent('content.unpublished', { async: true })
  async onContentUnpublished(payload: EventPayload<'content.unpublished'>): Promise<void> {
    await this.log({
      action: 'content.unpublished',
      entityType: payload.schema,
      entityId: payload.documentId,
      userId: payload.userId ?? 'system',
      ipAddress: payload.ipAddress,
    })
  }

  @OnEvent('content.version.restored', { async: true })
  async onContentVersionRestored(payload: EventPayload<'content.version.restored'>): Promise<void> {
    await this.log({
      action: 'content.version.restored',
      entityType: payload.schema,
      entityId: payload.documentId,
      userId: payload.userId ?? 'system',
      ipAddress: payload.ipAddress,
      metadata: { version: payload.version },
    })
  }

  // -------------------------------------------------------------------------
  // User / auth event handlers
  // -------------------------------------------------------------------------

  @OnEvent('user.login', { async: true })
  async onUserLogin(payload: EventPayload<'user.login'>): Promise<void> {
    await this.log({
      action: 'user.login',
      entityType: 'user',
      entityId: payload.targetUserId,
      userId: payload.targetUserId,
      ipAddress: payload.ipAddress,
    })
  }

  @OnEvent('user.logout', { async: true })
  async onUserLogout(payload: EventPayload<'user.logout'>): Promise<void> {
    await this.log({
      action: 'user.logout',
      entityType: 'user',
      entityId: payload.targetUserId,
      userId: payload.targetUserId,
      ipAddress: payload.ipAddress,
    })
  }

  @OnEvent('user.registered', { async: true })
  async onUserRegistered(payload: EventPayload<'user.registered'>): Promise<void> {
    await this.log({
      action: 'user.registered',
      entityType: 'user',
      entityId: payload.targetUserId,
      userId: payload.targetUserId,
      ipAddress: payload.ipAddress,
    })
  }

  @OnEvent('user.password_changed', { async: true })
  async onUserPasswordChanged(payload: EventPayload<'user.password_changed'>): Promise<void> {
    await this.log({
      action: 'user.password_changed',
      entityType: 'user',
      entityId: payload.targetUserId,
      userId: payload.userId ?? payload.targetUserId,
      ipAddress: payload.ipAddress,
    })
  }

  // -------------------------------------------------------------------------
  // Settings event handlers
  // -------------------------------------------------------------------------

  @OnEvent('settings.updated', { async: true })
  async onSettingsUpdated(payload: EventPayload<'settings.updated'>): Promise<void> {
    await this.log({
      action: 'settings.updated',
      entityType: 'settings',
      entityId: payload.key,
      userId: payload.userId ?? 'system',
      ipAddress: payload.ipAddress,
    })
  }

  @OnEvent('settings.group_updated', { async: true })
  async onSettingsGroupUpdated(payload: EventPayload<'settings.group_updated'>): Promise<void> {
    await this.log({
      action: 'settings.group_updated',
      entityType: 'settings',
      entityId: payload.group,
      userId: payload.userId ?? 'system',
      ipAddress: payload.ipAddress,
    })
  }

  // -------------------------------------------------------------------------
  // Media event handlers
  // -------------------------------------------------------------------------

  @OnEvent('media.uploaded', { async: true })
  async onMediaUploaded(payload: EventPayload<'media.uploaded'>): Promise<void> {
    await this.log({
      action: 'media.uploaded',
      entityType: 'media',
      entityId: payload.fileId,
      entityName: payload.filename,
      userId: payload.userId ?? 'system',
      ipAddress: payload.ipAddress,
      metadata: {
        mimeType: payload.mimeType,
        size: payload.size,
        folder: payload.folder,
      },
    })
  }

  @OnEvent('media.deleted', { async: true })
  async onMediaDeleted(payload: EventPayload<'media.deleted'>): Promise<void> {
    await this.log({
      action: 'media.deleted',
      entityType: 'media',
      entityId: payload.fileId,
      entityName: payload.filename,
      userId: payload.userId ?? 'system',
      ipAddress: payload.ipAddress,
    })
  }

  @OnEvent('media.folder_created', { async: true })
  async onMediaFolderCreated(payload: EventPayload<'media.folder_created'>): Promise<void> {
    await this.log({
      action: 'media.folder_created',
      entityType: 'media_folder',
      entityId: payload.folderId,
      entityName: payload.folderName,
      userId: payload.userId ?? 'system',
      ipAddress: payload.ipAddress,
      metadata: { parentFolder: payload.parentFolder },
    })
  }

  @OnEvent('media.folder_deleted', { async: true })
  async onMediaFolderDeleted(payload: EventPayload<'media.folder_deleted'>): Promise<void> {
    await this.log({
      action: 'media.folder_deleted',
      entityType: 'media_folder',
      entityId: payload.folderId,
      entityName: payload.folderName,
      userId: payload.userId ?? 'system',
      ipAddress: payload.ipAddress,
    })
  }

  // -------------------------------------------------------------------------
  // API key event handlers
  // -------------------------------------------------------------------------

  @OnEvent('api_key.created', { async: true })
  async onApiKeyCreated(payload: EventPayload<'api_key.created'>): Promise<void> {
    await this.log({
      action: 'api_key.created',
      entityType: 'api_key',
      entityId: payload.apiKeyId,
      entityName: payload.name,
      userId: payload.userId ?? 'system',
      ipAddress: payload.ipAddress,
    })
  }

  @OnEvent('api_key.revoked', { async: true })
  async onApiKeyRevoked(payload: EventPayload<'api_key.revoked'>): Promise<void> {
    await this.log({
      action: 'api_key.revoked',
      entityType: 'api_key',
      entityId: payload.apiKeyId,
      entityName: payload.name,
      userId: payload.userId ?? 'system',
      ipAddress: payload.ipAddress,
    })
  }

  @OnEvent('api_key.used', { async: true })
  async onApiKeyUsed(payload: EventPayload<'api_key.used'>): Promise<void> {
    await this.log({
      action: 'api_key.used',
      entityType: 'api_key',
      entityId: payload.apiKeyId,
      entityName: payload.name,
      userId: payload.userId ?? 'system',
      metadata: { endpoint: payload.endpoint },
    })
  }

  // -------------------------------------------------------------------------
  // Query methods
  // -------------------------------------------------------------------------

  /**
   * Get recent activities, newest first.
   */
  async getRecent(limit = 50): Promise<Activity[]> {
    return this.activityModel
      .query()
      .sort({ timestamp: -1 } satisfies SortQuery<Activity>)
      .limit(limit)
      .exec()
  }

  /**
   * Get activities for a specific entity.
   */
  async getByEntity(entityType: string, entityId: string, limit = 100): Promise<Activity[]> {
    return this.activityModel
      .query()
      .where({ entityType, entityId } satisfies FilterQuery<Activity>)
      .sort({ timestamp: -1 } satisfies SortQuery<Activity>)
      .limit(limit)
      .exec()
  }

  /**
   * Get activities performed by a specific user.
   */
  async getByUser(userId: string, limit = 100): Promise<Activity[]> {
    return this.activityModel
      .query()
      .where({ userId } satisfies FilterQuery<Activity>)
      .sort({ timestamp: -1 } satisfies SortQuery<Activity>)
      .limit(limit)
      .exec()
  }

  /**
   * Search activities with optional filters and pagination.
   */
  async search(query: ActivitySearchQuery): Promise<PaginatedActivities> {
    const limit = query.limit ?? 50
    const offset = query.offset ?? 0

    const filter: FilterQuery<Activity> = {}
    if (query.action) filter.action = query.action
    if (query.entityType) filter.entityType = query.entityType
    if (query.entityId) filter.entityId = query.entityId
    if (query.userId) filter.userId = query.userId
    if (query.from || query.to) {
      const tsFilter: Record<string, Date> = {}
      if (query.from) tsFilter.$gte = query.from
      if (query.to) tsFilter.$lte = query.to
      ;(filter as Record<string, unknown>).timestamp = tsFilter
    }

    const [items, total] = await Promise.all([
      this.activityModel
        .query()
        .where(filter)
        .sort({ timestamp: -1 } satisfies SortQuery<Activity>)
        .limit(limit)
        .skip(offset)
        .exec(),
      this.activityModel.query().where(filter).count(),
    ])

    return { items, total, limit, offset }
  }

  /**
   * Delete activities older than the given number of days.
   * Returns the number of deleted records.
   */
  async cleanup(retentionDays: number): Promise<number> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - retentionDays)

    // NOTE: The BaseModel interface exposes only equality-based delete().
    // A bulk-delete with a date operator is not available, so we fetch then
    // delete individually. This is acceptable for scheduled cleanup jobs
    // where high throughput is not required.
    const old = await this.activityModel
      .query()
      .where({ timestamp: { $lt: cutoff } } as FilterQuery<Activity>)
      .exec()

    const deletePromises = old.map((record) =>
      this.activityModel.delete({ id: record.id } as Partial<Activity>),
    )
    const results = await Promise.all(deletePromises)
    return results.filter(Boolean).length
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async getSettings(): Promise<ActivitySettings> {
    return this.settingsService.get(ActivitySettings)
  }

  /**
   * Convert FieldChange[] from event payload to CreateActivityDto.changes format.
   */
  private mapFieldChanges(fieldChanges: FieldChange[]): CreateActivityDto['changes'] {
    const before: Record<string, unknown> = {}
    const after: Record<string, unknown> = {}
    const fields: string[] = []

    for (const change of fieldChanges) {
      fields.push(change.field)
      before[change.field] = change.oldValue
      after[change.field] = change.newValue
    }

    return { before, after, fields }
  }
}
