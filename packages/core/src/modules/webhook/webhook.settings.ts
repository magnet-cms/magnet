import { SettingField, Settings } from '@magnet-cms/common'

/**
 * Webhook system settings schema.
 *
 * Controls whether webhooks are enabled, retry behavior, request timeout,
 * and delivery log retention.
 */
@Settings({
  group: 'webhooks',
  label: 'Webhooks',
  icon: 'webhook',
  order: 60,
  description: 'Configure outgoing webhook delivery and retry behavior',
  sections: [
    {
      name: 'general',
      label: 'General',
      icon: 'settings',
      description: 'Enable or disable the webhook system',
      order: 1,
    },
    {
      name: 'delivery',
      label: 'Delivery',
      icon: 'send',
      description: 'Configure request timeout and retry behavior',
      order: 2,
    },
    {
      name: 'retention',
      label: 'Retention',
      icon: 'clock',
      description: 'Configure how long delivery logs are stored',
      order: 3,
    },
  ],
})
export class WebhookSettings {
  @SettingField.Boolean({
    label: 'Enable Webhooks',
    description: 'Allow the system to dispatch outgoing webhook requests',
    default: true,
    section: 'general',
    order: 1,
  })
  enabled = true

  @SettingField.Number({
    label: 'Max Retries',
    description:
      'Number of retry attempts for failed deliveries (exponential backoff: 1s, 5s, 30s)',
    default: 3,
    section: 'delivery',
    order: 1,
  })
  maxRetries = 3

  @SettingField.Number({
    label: 'Request Timeout (ms)',
    description: 'Maximum time in milliseconds to wait for a webhook response',
    default: 10000,
    section: 'delivery',
    order: 2,
  })
  timeoutMs = 10000

  @SettingField.Number({
    label: 'Retention Period (days)',
    description: 'Number of days to keep delivery log records before automatic cleanup',
    default: 30,
    section: 'retention',
    order: 1,
  })
  retentionDays = 30
}
