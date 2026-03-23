import { Field, Schema } from '@magnet-cms/common'
import { IsBoolean, IsDate, IsOptional, IsString } from 'class-validator'

/**
 * A single historical version of an email template body/subject.
 * Stored as JSON in the versions array — capped at 5 entries.
 */
export interface EmailTemplateVersion {
	subject: string
	body: string
	editedBy: string
	editedAt: string // ISO date string
}

/**
 * Email template schema — stores message templates in the database.
 *
 * Templates are identified by slug + locale. The body stores HTML
 * (converted from Lexical editor via @lexical/html in the admin UI).
 * Handlebars compiles the body at send time using provided data variables.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class EmailTemplate {
	/**
	 * Unique identifier slug for this template (e.g. 'welcome', 'password-reset').
	 * Combined with locale to form a compound unique key.
	 */
	@Field.Text({ required: true })
	@Field.Validators(IsString())
	slug!: string

	/**
	 * Locale for this template variant (e.g. 'en', 'pt-BR').
	 * Same slug with different locales are separate rows.
	 */
	@Field.Text({ required: true, default: 'en' })
	@Field.Validators(IsString())
	locale = 'en'

	/**
	 * Email subject line — supports Handlebars variables (e.g. 'Welcome, {{name}}!').
	 */
	@Field.Text({ required: true })
	@Field.Validators(IsString())
	subject!: string

	/**
	 * Email body HTML — edited via Lexical WYSIWYG and stored as HTML string.
	 * Supports Handlebars variable interpolation at send time.
	 */
	@Field.Textarea({ required: true })
	@Field.Validators(IsString())
	body!: string

	/**
	 * Category for grouping templates (e.g. 'transactional', 'marketing', 'system').
	 */
	@Field.Text({ required: true, default: 'transactional' })
	@Field.Validators(IsString())
	category = 'transactional'

	/**
	 * Declared variable names available in this template (e.g. ['name', 'activationUrl']).
	 * Drives the variable insertion toolbar in the admin editor.
	 */
	@Field.Tags()
	@Field.Validators(IsOptional())
	variables: string[] = []

	/**
	 * Version history — last 5 edits stored as JSON array.
	 * Each entry contains {subject, body, editedBy, editedAt}.
	 */
	@Field.JSON()
	@Field.Validators(IsOptional())
	versions: EmailTemplateVersion[] = []

	/**
	 * Whether this template is active and should be used for sending.
	 */
	@Field.Boolean({ default: true })
	@Field.Validators(IsBoolean())
	active = true

	/**
	 * ID of the user who created this template.
	 */
	@Field.Text()
	@Field.Validators(IsOptional(), IsString())
	createdBy = ''

	/**
	 * ID of the user who last updated this template.
	 */
	@Field.Text()
	@Field.Validators(IsOptional(), IsString())
	updatedBy = ''

	/**
	 * Creation timestamp.
	 */
	@Field.DateTime({ default: () => new Date() })
	@Field.Validators(IsDate())
	createdAt: Date = new Date()

	/**
	 * Last update timestamp.
	 */
	@Field.DateTime({ default: () => new Date() })
	@Field.Validators(IsDate())
	updatedAt: Date = new Date()
}
