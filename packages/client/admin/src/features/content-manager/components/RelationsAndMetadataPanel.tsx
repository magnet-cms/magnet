'use client'

import type { SchemaProperty } from '@magnet-cms/common'
import type { ReactElement } from 'react'
import { useAppIntl } from '~/i18n'

interface RelationsAndMetadataPanelProps {
	// Relationship fields from the schema
	relationshipFields?: SchemaProperty[]
	// Side panel fields from the schema
	sidePanelFields?: SchemaProperty[]
	// Function to render a field (passed from FormBuilder)
	renderField?: (prop: SchemaProperty) => ReactElement
	// Metadata for display
	metadata?: {
		createdAt?: string | Date
		updatedAt?: string | Date
		publishedAt?: string | Date
	}
	// Optional - if false, relations section won't be shown (for read-only views)
	showRelations?: boolean
}

/**
 * Format a date for display using intl
 */
function formatRelativeDate(
	date: string | Date | undefined,
	intl: ReturnType<typeof useAppIntl>,
): string {
	if (!date)
		return intl.formatMessage({
			id: 'contentManager.metadata.never',
			defaultMessage: 'Never',
		})

	const d = typeof date === 'string' ? new Date(date) : date
	if (Number.isNaN(d.getTime()))
		return intl.formatMessage({
			id: 'contentManager.metadata.never',
			defaultMessage: 'Never',
		})

	const now = new Date()
	const diffMs = now.getTime() - d.getTime()
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

	if (diffDays === 0)
		return intl.formatMessage({
			id: 'contentManager.metadata.today',
			defaultMessage: 'Today',
		})
	if (diffDays === 1)
		return intl.formatMessage({
			id: 'contentManager.metadata.yesterday',
			defaultMessage: 'Yesterday',
		})
	if (diffDays < 7)
		return intl.formatMessage(
			{
				id: 'contentManager.metadata.daysAgo',
				defaultMessage: '{count, plural, one {# day ago} other {# days ago}}',
			},
			{ count: diffDays },
		)
	if (diffDays < 30)
		return intl.formatMessage(
			{
				id: 'contentManager.metadata.weeksAgo',
				defaultMessage: '{count, plural, one {# week ago} other {# weeks ago}}',
			},
			{ count: Math.floor(diffDays / 7) },
		)
	if (diffDays < 365)
		return intl.formatMessage(
			{
				id: 'contentManager.metadata.monthsAgo',
				defaultMessage:
					'{count, plural, one {# month ago} other {# months ago}}',
			},
			{ count: Math.floor(diffDays / 30) },
		)
	return intl.formatMessage(
		{
			id: 'contentManager.metadata.yearsAgo',
			defaultMessage: '{count, plural, one {# year ago} other {# years ago}}',
		},
		{ count: Math.floor(diffDays / 365) },
	)
}

export function RelationsAndMetadataPanel({
	relationshipFields = [],
	sidePanelFields = [],
	renderField,
	metadata,
	showRelations = true,
}: RelationsAndMetadataPanelProps) {
	const intl = useAppIntl()
	const hasRelations =
		showRelations && relationshipFields.length > 0 && renderField
	const hasSidePanelFields = sidePanelFields.length > 0 && renderField

	return (
		<aside className="w-80 shrink-0 bg-card border-l border-border hidden md:flex flex-col overflow-y-auto">
			<div className="flex-1 overflow-y-auto">
				<div className="p-4 space-y-6">
					{/* Relationship fields */}
					{hasRelations && (
						<div>
							<h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
								{intl.formatMessage({
									id: 'contentManager.metadata.relations',
									defaultMessage: 'Relations',
								})}
							</h2>
							<div className="space-y-4">
								{relationshipFields.map((prop) => (
									<div key={prop.name}>{renderField(prop)}</div>
								))}
							</div>
						</div>
					)}

					{/* Side panel fields */}
					{hasSidePanelFields && (
						<div>
							<h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
								{intl.formatMessage({
									id: 'contentManager.metadata.additionalInfo',
									defaultMessage: 'Additional Info',
								})}
							</h2>
							<div className="space-y-4">
								{sidePanelFields.map((prop) => (
									<div key={prop.name}>{renderField(prop)}</div>
								))}
							</div>
						</div>
					)}

					{/* Metadata - Always visible */}
					<div>
						<h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
							{intl.formatMessage({
								id: 'contentManager.metadata.title',
								defaultMessage: 'Metadata',
							})}
						</h2>
						<div className="space-y-4">
							<div className="flex justify-between items-center text-sm">
								<span className="text-muted-foreground">
									{intl.formatMessage({
										id: 'contentManager.metadata.created',
										defaultMessage: 'Created',
									})}
								</span>
								<span className="font-medium text-foreground">
									{formatRelativeDate(metadata?.createdAt, intl)}
								</span>
							</div>
							<div className="flex justify-between items-center text-sm">
								<span className="text-muted-foreground">
									{intl.formatMessage({
										id: 'contentManager.metadata.updated',
										defaultMessage: 'Updated',
									})}
								</span>
								<span className="font-medium text-foreground">
									{formatRelativeDate(metadata?.updatedAt, intl)}
								</span>
							</div>
							<div className="flex justify-between items-center text-sm">
								<span className="text-muted-foreground">
									{intl.formatMessage({
										id: 'contentManager.metadata.lastPublished',
										defaultMessage: 'Last Published',
									})}
								</span>
								<span className="font-medium text-foreground">
									{formatRelativeDate(metadata?.publishedAt, intl)}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</aside>
	)
}
