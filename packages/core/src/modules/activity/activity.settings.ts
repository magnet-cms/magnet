import { SettingField, Settings } from '@magnet-cms/common'

/**
 * Activity logging settings schema.
 *
 * Controls activity log retention, detail level, and what data is captured.
 *
 * @example
 * ```typescript
 * const config = await settingsService.get(ActivitySettings)
 * if (!config.enabled) return
 * ```
 */
@Settings({
	group: 'activity',
	label: 'Activity Logs',
	icon: 'activity',
	order: 50,
	description: 'Configure activity logging and audit trail behavior',
	sections: [
		{
			name: 'general',
			label: 'General',
			icon: 'settings',
			description: 'Enable or disable activity logging',
			order: 1,
		},
		{
			name: 'retention',
			label: 'Retention',
			icon: 'clock',
			description: 'Configure how long activity logs are kept',
			order: 2,
		},
		{
			name: 'tracking',
			label: 'Tracking',
			icon: 'search',
			description: 'Configure what data is captured in activity logs',
			order: 3,
		},
	],
})
export class ActivitySettings {
	@SettingField.Boolean({
		label: 'Enable Activity Logging',
		description: 'Track user actions as activity log entries',
		default: true,
		section: 'general',
		order: 1,
	})
	enabled = true

	@SettingField.Select({
		label: 'Log Level',
		description: 'Amount of detail captured in each activity record',
		options: [
			{ label: 'Minimal', value: 'minimal' },
			{ label: 'Standard', value: 'standard' },
			{ label: 'Detailed', value: 'detailed' },
		],
		default: 'standard',
		section: 'general',
		order: 2,
	})
	logLevel = 'standard'

	@SettingField.Number({
		label: 'Retention Period (days)',
		description: 'Number of days to keep activity records before cleanup',
		default: 90,
		section: 'retention',
		order: 1,
	})
	retentionDays = 90

	@SettingField.Boolean({
		label: 'Log IP Addresses',
		description: 'Store the IP address of the user in activity records',
		default: true,
		section: 'tracking',
		order: 1,
	})
	logIpAddresses = true

	@SettingField.Boolean({
		label: 'Track Field Changes',
		description:
			'Include before/after field values in content update activity records',
		default: true,
		section: 'tracking',
		order: 2,
	})
	trackFieldChanges = true
}
