import type { SchemaProperty } from '@magnet-cms/common'
import {
	Button,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Separator,
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	Sortable,
	SortableContent,
	SortableItem,
	SortableItemHandle,
	Switch,
} from '@magnet-cms/ui'
import { GripVertical } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ViewConfig, ViewConfigColumn } from '../hooks/useViewConfig'

// ============================================================================
// Props
// ============================================================================

interface ConfigureViewDrawerProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	properties: SchemaProperty[]
	config: ViewConfig
	onSave: (config: Omit<ViewConfig, 'updatedAt'>) => void
}

// ============================================================================
// Helpers
// ============================================================================

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50]
const SORT_NONE = '__none__'

function buildDefaultColumns(properties: SchemaProperty[]): ViewConfigColumn[] {
	return properties.map((p, i) => ({
		name: p.name,
		visible: true,
		order: i,
	}))
}

function mergeWithProperties(
	properties: SchemaProperty[],
	columns: ViewConfigColumn[],
): ViewConfigColumn[] {
	// Columns in config order, with any new properties appended
	const configMap = new Map(columns.map((c) => [c.name, c]))
	const merged: ViewConfigColumn[] = []

	// First: all columns from config (preserving order), only if still in schema
	for (const col of columns) {
		if (properties.some((p) => p.name === col.name)) {
			merged.push(col)
		}
	}

	// Then: any new properties not yet in config
	for (const prop of properties) {
		if (!configMap.has(prop.name)) {
			merged.push({ name: prop.name, visible: true, order: merged.length })
		}
	}

	return merged
}

// ============================================================================
// Component
// ============================================================================

export function ConfigureViewDrawer({
	open,
	onOpenChange,
	properties,
	config,
	onSave,
}: ConfigureViewDrawerProps) {
	const [columns, setColumns] = useState<ViewConfigColumn[]>(() =>
		mergeWithProperties(properties, config.columns),
	)
	const [pageSize, setPageSize] = useState(config.pageSize)
	const [sortField, setSortField] = useState(config.sortField || SORT_NONE)
	const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
		config.sortDirection ?? 'asc',
	)

	// Sync local state when config prop changes (e.g. on initial load from API)
	useEffect(() => {
		setColumns(mergeWithProperties(properties, config.columns))
		setPageSize(config.pageSize)
		setSortField(config.sortField || SORT_NONE)
		setSortDirection(config.sortDirection ?? 'asc')
	}, [config, properties])

	function handleToggle(name: string, visible: boolean) {
		setColumns((prev) =>
			prev.map((c) => (c.name === name ? { ...c, visible } : c)),
		)
	}

	function handleReorder(reordered: ViewConfigColumn[]) {
		setColumns(reordered.map((col, i) => ({ ...col, order: i })))
	}

	function handleReset() {
		const defaults = buildDefaultColumns(properties)
		setColumns(defaults)
		setPageSize(10)
		setSortField(SORT_NONE)
		setSortDirection('asc')
	}

	function handleApply() {
		const resolvedSortField =
			sortField && sortField !== SORT_NONE ? sortField : undefined
		onSave({
			columns: columns.map((c, i) => ({ ...c, order: i })),
			pageSize,
			sortField: resolvedSortField,
			sortDirection: resolvedSortField ? sortDirection : undefined,
		})
		onOpenChange(false)
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="flex w-full flex-col p-0 sm:max-w-sm"
			>
				<SheetHeader className="sticky top-0 z-10 border-b bg-background px-5 py-4">
					<SheetTitle>Configure View</SheetTitle>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
					{/* Column visibility & order */}
					<div>
						<p className="text-sm font-medium mb-3">Columns</p>
						<p className="text-xs text-muted-foreground mb-3">
							Toggle visibility and drag to reorder.
						</p>
						<Sortable
							value={columns}
							onValueChange={handleReorder}
							getItemValue={(col) => col.name}
							orientation="vertical"
						>
							<SortableContent className="space-y-1">
								{columns.map((col) => (
									<SortableItem key={col.name} value={col.name} asChild>
										<div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
											<div className="flex items-center gap-2">
												<SortableItemHandle asChild>
													<button
														type="button"
														className="cursor-grab text-muted-foreground hover:text-foreground"
														aria-label={`Drag to reorder ${col.name}`}
													>
														<GripVertical className="h-4 w-4" />
													</button>
												</SortableItemHandle>
												<Label className="text-sm font-normal capitalize cursor-pointer">
													{col.name}
												</Label>
											</div>
											<Switch
												checked={col.visible}
												onCheckedChange={(checked) =>
													handleToggle(col.name, checked)
												}
												aria-label={`Toggle ${col.name} column`}
											/>
										</div>
									</SortableItem>
								))}
							</SortableContent>
						</Sortable>
					</div>

					<Separator />

					{/* Display settings */}
					<div className="space-y-4">
						<p className="text-sm font-medium">Display Settings</p>

						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">
								Default Page Size
							</Label>
							<Select
								value={String(pageSize)}
								onValueChange={(v) => setPageSize(Number(v))}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PAGE_SIZE_OPTIONS.map((size) => (
										<SelectItem key={size} value={String(size)}>
											{size} rows
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">
								Default Sort Field
							</Label>
							<Select value={sortField} onValueChange={setSortField}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="None" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={SORT_NONE}>None</SelectItem>
									{properties.map((p) => (
										<SelectItem key={p.name} value={p.name}>
											{p.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{sortField && sortField !== SORT_NONE && (
							<div className="space-y-1.5">
								<Label className="text-xs text-muted-foreground">
									Sort Direction
								</Label>
								<Select
									value={sortDirection}
									onValueChange={(v) => setSortDirection(v as 'asc' | 'desc')}
								>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="asc">Ascending</SelectItem>
										<SelectItem value="desc">Descending</SelectItem>
									</SelectContent>
								</Select>
							</div>
						)}
					</div>
				</div>

				<SheetFooter className="flex justify-between border-t px-5 py-4">
					<Button variant="ghost" size="sm" onClick={handleReset}>
						Reset to Defaults
					</Button>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button size="sm" onClick={handleApply}>
							Apply
						</Button>
					</div>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	)
}
