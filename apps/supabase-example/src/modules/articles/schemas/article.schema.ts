import { Prop, Schema, UI } from '@magnet-cms/common'

/**
 * Article schema for news articles.
 * Demonstrates full Supabase integration with database, auth, and storage.
 */
@Schema({
	i18n: true,
	versioning: true,
})
export class Article {
	@Prop({ type: String, required: true, intl: true })
	@UI({ tab: 'General', description: 'Article title' })
	title: string

	@Prop({ type: String, intl: true })
	@UI({ tab: 'General', description: 'URL slug' })
	slug: string

	@Prop({ type: String, intl: true })
	@UI({ tab: 'General', type: 'richText', description: 'Article content' })
	content: string

	@Prop({ type: String, intl: true })
	@UI({
		tab: 'General',
		type: 'textarea',
		description: 'Brief summary for article listings',
	})
	summary: string

	@Prop({ type: String })
	@UI({
		tab: 'Media',
		type: 'upload',
		description: 'Cover image (uploaded to Supabase Storage)',
	})
	coverImage: string

	@Prop({ type: String })
	@UI({ tab: 'Sidebar', description: 'Linked to Supabase Auth user' })
	authorId: string

	@Prop({ type: String })
	@UI({
		tab: 'Sidebar',
		type: 'select',
		description: 'Article category',
		options: [
			{ key: 'News', value: 'news' },
			{ key: 'Tutorial', value: 'tutorial' },
			{ key: 'Opinion', value: 'opinion' },
			{ key: 'Review', value: 'review' },
		],
	})
	category: string

	@Prop({ type: [String] })
	@UI({ tab: 'Sidebar', description: 'Article tags' })
	tags: string[]

	@Prop({ type: Boolean, default: false })
	@UI({ tab: 'Sidebar', type: 'switch', description: 'Featured article' })
	featured: boolean

	@Prop({ type: Number, default: 0 })
	@UI({ tab: 'Sidebar', type: 'number', description: 'View count' })
	viewCount: number
}
