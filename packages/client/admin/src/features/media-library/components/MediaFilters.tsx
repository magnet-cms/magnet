import { FilterBar, type ViewMode } from '@magnet-cms/ui'

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

const typeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'images', label: 'Images' },
  { value: 'videos', label: 'Videos' },
  { value: 'documents', label: 'Documents' },
]

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'size-large', label: 'Size (Large-Small)' },
  { value: 'size-small', label: 'Size (Small-Large)' },
]

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
  return (
    <FilterBar>
      <FilterBar.Search
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search assets..."
      />

      <FilterBar.Group>
        <FilterBar.Select value={typeFilter} onChange={onTypeFilterChange} options={typeOptions} />

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
