import { SchemaProperty } from '@magnet-cms/common'
import { RHFMultiSelect, RHFSelect } from '@magnet-cms/ui/components'
import { capitalize } from '@magnet-cms/utils'
import { ReactElement } from 'react'
import { useContentList } from '../../hooks/useSchema'

/**
 * Relationship field that fetches options from the target schema
 * Renders as a select dropdown for single relations or multi-select for arrays
 * Shows all items (including drafts) so users can create relationships
 */
export function RelationshipField(prop: SchemaProperty): ReactElement {
	const { ref: targetSchema, name, isArray } = prop

	if (!targetSchema) {
		return (
			<div>
				Missing ref for relationship field {name}. Please specify ref in @Prop
				decorator.
			</div>
		)
	}

	// Fetch all items from the target schema (including drafts)
	// For relationship selectors, we show all content so users can link to any item
	const {
		data: items = [],
		isLoading,
		error,
	} = useContentList(targetSchema)

	if (error) {
		return (
			<div>
				Error loading {targetSchema}: {error.message}
			</div>
		)
	}

	if (isLoading) {
		return <div>Loading {targetSchema}...</div>
	}

	// Transform items to options format { value: id, label: displayName }
	// Try to find a display field (name, title, email, etc.) or fall back to id
	const options = items.map((item: Record<string, unknown>) => {
		const id = item.id as string
		const displayName =
			(item.name as string) ||
			(item.title as string) ||
			(item.email as string) ||
			(item.tagID as string) ||
			id
		return {
			value: id,
			label: String(displayName),
		}
	})

	if (isArray) {
		return (
			<RHFMultiSelect
				key={prop.name}
				name={prop.name}
				label={capitalize(prop.ui?.label || prop.name)}
				description={prop.ui?.description}
				options={options}
			/>
		)
	}

	return (
		<RHFSelect
			key={prop.name}
			name={prop.name}
			label={capitalize(prop.ui?.label || prop.name)}
			description={prop.ui?.description}
			options={options}
		/>
	)
}
