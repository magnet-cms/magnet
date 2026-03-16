import { Field, Schema } from '@magnet-cms/common'

/**
 * Post schema for blog posts.
 * Demonstrates Drizzle ORM adapter with SQL database.
 */
@Schema({
	i18n: true,
	versioning: true,
})
export class Post {
	@Field.Text({
		required: true,
		intl: true,
		tab: 'General',
		description: 'Post title',
	})
	title: string

	@Field.Slug({
		from: 'title',
		intl: true,
		tab: 'General',
		description: 'URL slug',
	})
	slug: string

	@Field.Textarea({
		intl: true,
		tab: 'General',
		description: 'Post content',
	})
	content: string

	@Field.Textarea({
		intl: true,
		tab: 'General',
		description: 'Brief summary',
	})
	excerpt: string

	@Field.Image({ tab: 'Media', description: 'Featured image' })
	featuredImage: string

	@Field.Tags({ default: [], tab: 'General', description: 'Post tags' })
	tags: string[]

	@Field.Boolean({
		default: false,
		tab: 'General',
		description: 'Featured post',
	})
	featured: boolean
}
