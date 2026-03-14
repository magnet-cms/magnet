import { FilterBar, type ViewMode } from '@magnet-cms/ui'
import { useAppIntl } from '~/i18n'

interface MediaFiltersProps {
	searchQuery: string
	onSearchChange: (query: string) => void
	typeFilter: string
	onTypeFilterChange: (type: string) => void
	sortBy: string
	onSortChange: (sort: string) => void
	viewMode: ViewMode
	onViewModeChange: (mode: ViewMode) => void
}

export function MediaFilters({
	searchQuery,
	onSearchChange,
	typeFilter,
	onTypeFilterChange,
	sortBy,
	onSortChange,
	viewMode,
	onViewModeChange,
}: MediaFiltersProps) {
	const intl = useAppIntl()

	const typeOptions = [
		{
			value: 'all',
			label: intl.formatMessage({
				id: 'media.filters.allTypes',
				defaultMessage: 'All Types',
			}),
		},
		{
			value: 'images',
			label: intl.formatMessage({
				id: 'media.filters.images',
				defaultMessage: 'Images',
			}),
		},
		{
			value: 'videos',
			label: intl.formatMessage({
				id: 'media.filters.videos',
				defaultMessage: 'Videos',
			}),
		},
		{
			value: 'documents',
			label: intl.formatMessage({
				id: 'media.filters.documents',
				defaultMessage: 'Documents',
			}),
		},
	]

	const sortOptions = [
		{
			value: 'newest',
			label: intl.formatMessage({
				id: 'media.filters.newestFirst',
				defaultMessage: 'Newest First',
			}),
		},
		{
			value: 'oldest',
			label: intl.formatMessage({
				id: 'media.filters.oldestFirst',
				defaultMessage: 'Oldest First',
			}),
		},
		{
			value: 'name-asc',
			label: intl.formatMessage({
				id: 'media.filters.nameAZ',
				defaultMessage: 'Name (A-Z)',
			}),
		},
		{
			value: 'name-desc',
			label: intl.formatMessage({
				id: 'media.filters.nameZA',
				defaultMessage: 'Name (Z-A)',
			}),
		},
		{
			value: 'size-large',
			label: intl.formatMessage({
				id: 'media.filters.sizeLarge',
				defaultMessage: 'Size (Large-Small)',
			}),
		},
		{
			value: 'size-small',
			label: intl.formatMessage({
				id: 'media.filters.sizeSmall',
				defaultMessage: 'Size (Small-Large)',
			}),
		},
	]

	return (
		<FilterBar>
			<FilterBar.Search
				value={searchQuery}
				onChange={onSearchChange}
				placeholder={intl.formatMessage({
					id: 'media.filters.searchPlaceholder',
					defaultMessage: 'Search assets...',
				})}
			/>

			<FilterBar.Group>
				<FilterBar.Select
					value={typeFilter}
					onChange={onTypeFilterChange}
					options={typeOptions}
				/>

				<FilterBar.Select
					value={sortBy}
					onChange={onSortChange}
					options={sortOptions}
					minWidth="140px"
				/>

				<FilterBar.Divider />

				<FilterBar.ViewToggle value={viewMode} onChange={onViewModeChange} />
			</FilterBar.Group>
		</FilterBar>
	)
}

// Re-export ViewMode type for consumers
export type { ViewMode }
