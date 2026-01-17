import { Prop, Schema, UI } from '@magnet-cms/common'

/**
 * Post schema for blog posts.
 * Demonstrates Drizzle ORM adapter with SQL database.
 */
@Schema({
	i18n: true,
	versioning: true,
})
export class Post {
	@Prop({ type: String, required: true, intl: true })
	@UI({ tab: 'General', description: 'Post title' })
	title: string

	@Prop({ type: String, intl: true })
	@UI({ tab: 'General', description: 'URL slug' })
	slug: string

	@Prop({ type: String, intl: true })
	@UI({ tab: 'General', type: 'textarea', description: 'Post content' })
	content: string

	@Prop({ type: String, intl: true })
	@UI({ tab: 'General', type: 'textarea', description: 'Brief summary' })
	excerpt: string

	@Prop({ type: String })
	@UI({ tab: 'Media', type: 'upload', description: 'Featured image' })
	featuredImage: string

	@Prop({ type: [String], default: [] })
	@UI({ tab: 'General', description: 'Post tags' })
	tags: string[]

	@Prop({ type: Boolean, default: false })
	@UI({ tab: 'General', type: 'switch', description: 'Featured post' })
	featured: boolean
}
