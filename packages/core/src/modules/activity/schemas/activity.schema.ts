import { Field, Prop, Schema } from '@magnet-cms/common'
import type { EventName } from '@magnet-cms/common'

/**
 * Activity log record. Tracks user actions for audit trail purposes.
 *
 * This schema uses `versioning: false` and `i18n: false` because activity logs
 * are internal records that should not themselves be versioned or localized.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class Activity {
  /**
   * The event/action that was performed.
   * Uses EventName strings from the event system (e.g., 'content.created', 'user.login').
   */
  @Field.Text({ required: true })
  action!: EventName

  /**
   * The type of entity that was acted upon (e.g., 'content', 'user', 'api_key').
   */
  @Field.Text({ required: true })
  entityType!: string

  /**
   * The ID of the entity that was acted upon.
   */
  @Field.Text()
  entityId?: string

  /**
   * Human-readable name of the entity (e.g., "Blog Post: Hello World").
   */
  @Field.Text()
  entityName?: string

  /**
   * ID of the user who performed the action.
   */
  @Field.Text({ required: true })
  userId!: string

  /**
   * Denormalized display name of the user.
   */
  @Field.Text()
  userName?: string

  /**
   * Additional context metadata as a JSON object.
   */
  @Prop({ type: Object })
  metadata?: Record<string, unknown>

  /**
   * Field-level changes recorded for content update events.
   */
  @Prop({ type: Object })
  changes?: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
    fields?: string[]
  }

  /**
   * IP address of the request (if logIpAddresses setting is enabled).
   */
  @Field.Text()
  ipAddress?: string

  /**
   * User agent string from the request.
   */
  @Field.Text()
  userAgent?: string

  /**
   * When the activity occurred.
   */
  @Field.Date({ required: true, default: () => new Date() })
  timestamp!: Date
}
