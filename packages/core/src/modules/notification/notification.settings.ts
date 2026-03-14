import { SettingField, Settings } from '@magnet-cms/common'

/**
 * Notification system settings schema.
 *
 * Controls which channels are enabled, retention policy, and email delivery.
 *
 * @example
 * ```typescript
 * const config = await settingsService.get(NotificationSettings)
 * if (!config.enabled) return
 * ```
 */
@Settings({
	group: 'notifications',
	label: 'Notifications',
	icon: 'bell',
	order: 55,
	description: 'Configure the notification system and delivery channels',
	sections: [
		{
			name: 'general',
			label: 'General',
			icon: 'settings',
			description: 'Enable or disable the notification system',
			order: 1,
		},
		{
			name: 'channels',
			label: 'Channels',
			icon: 'send',
			description: 'Configure notification delivery channels',
			order: 2,
		},
		{
			name: 'retention',
			label: 'Retention',
			icon: 'clock',
			description: 'Configure how long notifications are stored',
			order: 3,
		},
	],
})
export class NotificationSettings {
	@SettingField.Boolean({
		label: 'Enable Notifications',
		description: 'Allow the system to create and deliver notifications',
		default: true,
		section: 'general',
		order: 1,
	})
	enabled = true

	@SettingField.Boolean({
		label: 'Platform Channel',
		description: 'Persist notifications in the database for in-app display',
		default: true,
		section: 'channels',
		order: 1,
	})
	platformChannelEnabled = true

	@SettingField.Boolean({
		label: 'Email Channel',
		description:
			'Send notifications via email (requires an email adapter to be configured)',
		default: false,
		section: 'channels',
		order: 2,
	})
	emailChannelEnabled = false

	@SettingField.Number({
		label: 'Retention Period (days)',
		description:
			'Number of days to keep notification records before automatic cleanup',
		default: 90,
		section: 'retention',
		order: 1,
	})
	retentionDays = 90
}
