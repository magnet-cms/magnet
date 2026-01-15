import {
	type DragEndEvent,
	KeyboardSensor,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import type { Row } from '@tanstack/react-table'
import * as React from 'react'

export type DragAndDropConfig<TData> = {
	enabled: boolean
	onReorder?: (rows: TData[]) => void
}

export function useDragAndDrop<TData>({
	data,
	getRowId,
	config,
}: {
	data: TData[]
	getRowId: (originalRow: TData, index: number, parent?: Row<TData>) => string
	config?: DragAndDropConfig<TData>
}) {
	const [tableData, setTableData] = React.useState<TData[]>(data)
	const isDraggingRef = React.useRef(false)
	const previousDataRef = React.useRef(data)

	React.useEffect(() => {
		// Don't update tableData during active drag operations
		if (isDraggingRef.current) {
			return
		}

		// Update tableData when external data changes
		if (data !== previousDataRef.current) {
			setTableData(data)
			previousDataRef.current = data
		}
	}, [data])

	const sensors = useSensors(
		useSensor(MouseSensor, {}),
		useSensor(TouchSensor, {}),
		useSensor(KeyboardSensor, {}),
	)

	const handleDragStart = React.useCallback(() => {
		isDraggingRef.current = true
	}, [])

	const handleDragEnd = React.useCallback(
		(event: DragEndEvent) => {
			isDraggingRef.current = false

			if (!config?.enabled) {
				return
			}

			const { active, over } = event
			if (!over || active.id === over.id) {
				return
			}

			setTableData((currentItems) => {
				const activeIndex = currentItems.findIndex(
					(item, index) => getRowId(item, index) === active.id,
				)
				const overIndex = currentItems.findIndex(
					(item, index) => getRowId(item, index) === over.id,
				)

				if (activeIndex === -1 || overIndex === -1) {
					return currentItems
				}

				const reordered = arrayMove(currentItems, activeIndex, overIndex)

				// Update previous data ref so we don't reset when parent updates
				previousDataRef.current = reordered

				// Call onReorder in next tick to avoid updating parent during render
				setTimeout(() => {
					config?.onReorder?.(reordered)
				}, 0)

				return reordered
			})
		},
		[config, getRowId],
	)

	return {
		tableData,
		sensors,
		handleDragStart,
		handleDragEnd,
	}
}
