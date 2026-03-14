import { SettingField, Settings } from '@magnet-cms/common'

/**
 * Email settings schema.
 *
 * These settings control email behavior and defaults.
 * Manageable from the admin settings panel.
 */
@Settings({
	group: 'email',
	label: 'Email',
	icon: 'mail',
	order: 6,
	description: 'Configure email delivery settings and defaults',
	sections: [
		{
			name: 'general',
			label: 'General',
			icon: 'settings',
			description: 'General email settings',
			order: 1,
		},
		{
			name: 'sender',
			label: 'Sender',
			icon: 'send',
			description: 'Default sender information',
			order: 2,
		},
	],
})
export class EmailSettings {
	@SettingField.Boolean({
		label: 'Enable Email Sending',
		description: 'Master toggle for all outgoing emails',
		default: true,
		section: 'general',
		order: 1,
	})
	enabled = true

	@SettingField.Text({
		label: 'Application URL',
		description: 'Base URL used for links in emails (e.g., https://myapp.com)',
		default: 'http://localhost:3000',
		section: 'general',
		order: 2,
	})
	appUrl = 'http://localhost:3000'

	@SettingField.Text({
		label: 'From Address',
		description: 'Default sender email address',
		default: 'noreply@example.com',
		section: 'sender',
		order: 1,
	})
	fromAddress = 'noreply@example.com'

	@SettingField.Text({
		label: 'From Name',
		description: 'Default sender display name',
		default: 'Magnet CMS',
		section: 'sender',
		order: 2,
	})
	fromName = 'Magnet CMS'

	@SettingField.Text({
		label: 'Reply-To Address',
		description: 'Default reply-to email address (optional)',
		default: '',
		section: 'sender',
		order: 3,
	})
	replyTo = ''
}
