import { SettingField, Settings } from '@magnet-cms/common'
import { locales } from '~/modules/database/modules/internationalization/setting/internationalization.setting'

/**
 * Content settings schema.
 *
 * These settings control content editing, publishing, and versioning behavior.
 *
 * @example
 * ```typescript
 * // In a service
 * const contentConfig = await settingsService.get(ContentSettings)
 * if (contentConfig.requireApproval) {
 *   await createApprovalRequest(document)
 * }
 * ```
 */
@Settings({
	group: 'content',
	label: 'Content Settings',
	icon: 'file-text',
	order: 15,
	description: 'Configure content editing, publishing, and versioning behavior',
	sections: [
		{
			name: 'editing',
			label: 'Editing',
			icon: 'edit',
			description: 'Configure content editing behavior',
			order: 1,
		},
		{
			name: 'publishing',
			label: 'Publishing',
			icon: 'send',
			description: 'Configure content publishing workflow',
			order: 2,
		},
		{
			name: 'versioning',
			label: 'Versioning',
			icon: 'history',
			description: 'Configure version history settings',
			order: 3,
		},
		{
			name: 'i18n',
			label: 'Internationalization',
			icon: 'languages',
			description: 'Configure multi-language content settings',
			order: 4,
		},
		{
			name: 'deletion',
			label: 'Deletion',
			icon: 'trash-2',
			description: 'Configure content deletion behavior',
			order: 5,
			variant: 'danger',
		},
	],
})
export class ContentSettings {
	// Editing
	@SettingField.Boolean({
		label: 'Enable Auto-save',
		description: 'Automatically save content while editing',
		default: true,
		section: 'editing',
		order: 1,
	})
	autoSave = true

	@SettingField.Number({
		label: 'Auto-save Interval (seconds)',
		description: 'How often to auto-save content',
		default: 30,
		section: 'editing',
		order: 2,
	})
	autoSaveInterval = 30

	// Publishing
	@SettingField.Select({
		label: 'Default Status',
		description: 'Initial status for new content',
		options: [
			{ label: 'Draft', value: 'draft' },
			{ label: 'Published', value: 'published' },
		],
		default: 'draft',
		section: 'publishing',
		order: 1,
	})
	defaultStatus = 'draft'

	@SettingField.Boolean({
		label: 'Require Publish Approval',
		description: 'Require approval before content can be published',
		default: false,
		section: 'publishing',
		order: 2,
	})
	requireApproval = false

	@SettingField.Boolean({
		label: 'Enable Scheduling',
		description: 'Allow content to be scheduled for future publishing',
		default: true,
		section: 'publishing',
		order: 3,
	})
	enableScheduling = true

	// Versioning
	@SettingField.Boolean({
		label: 'Enable Versioning',
		description: 'Track content changes with version history',
		default: true,
		section: 'versioning',
		order: 1,
	})
	enableVersioning = true

	@SettingField.Number({
		label: 'Max Revisions to Keep',
		description: 'Maximum number of content revisions to store',
		default: 20,
		section: 'versioning',
		order: 2,
	})
	maxRevisions = 20

	// Internationalization
	@SettingField.Boolean({
		label: 'Enable i18n',
		description: 'Enable internationalization for content',
		default: true,
		section: 'i18n',
		order: 1,
	})
	enableI18n = true

	@SettingField.Select({
		label: 'Available Languages',
		description: 'Select which languages are available for content',
		options: locales,
		default: ['en'],
		multiple: true,
		section: 'i18n',
		order: 2,
	})
	locales: string[] = ['en']

	@SettingField.Select({
		label: 'Default Locale',
		description: 'Default language for content',
		options: locales,
		default: 'en',
		section: 'i18n',
		order: 3,
	})
	defaultLocale = 'en'

	@SettingField.Boolean({
		label: 'Require All Locales',
		description: 'Require content to be translated to all enabled locales',
		default: false,
		section: 'i18n',
		order: 4,
	})
	requireAllLocales = false

	// Deletion
	@SettingField.Boolean({
		label: 'Enable Soft Delete',
		description: 'Move deleted content to trash instead of permanent deletion',
		default: true,
		section: 'deletion',
		order: 1,
	})
	enableSoftDelete = true

	@SettingField.Number({
		label: 'Trash Retention (days)',
		description: 'How long to keep deleted content in trash',
		default: 30,
		section: 'deletion',
		order: 2,
	})
	trashRetentionDays = 30
}
