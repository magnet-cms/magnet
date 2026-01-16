'use client'

import { type ReactNode, useState } from 'react'
import { useFormContext } from 'react-hook-form'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib'

import {
	DataTable,
	type DataTableColumn,
	type DataTableRowAction,
} from '../data-table'

type TableColumnConfig = {
	key: string
	header: string
	type?: 'text' | 'badge' | 'status' | 'input' | 'code'
}

type RHFTableProps<T extends Record<string, unknown>> = {
	name: string
	label?: string
	description?: ReactNode
	columns: TableColumnConfig[]
	formItemClassName?: string
	addButtonLabel?: string
	editDialogTitle?: string
	addDialogTitle?: string
	dialogDescription?: string
	readOnlyKey?: string
	readOnlyFields?: string[] // Fields that are read-only when readOnlyKey is true
	getRowId?: (item: T) => string
}

export function RHFTable<T extends Record<string, unknown>>({
	name,
	label,
	description,
	columns,
	formItemClassName,
	addButtonLabel = 'Add Item',
	editDialogTitle = 'Edit Item',
	addDialogTitle = 'Add Item',
	dialogDescription = 'Fill in the details below.',
	readOnlyKey = 'isLocal',
	readOnlyFields = ['connectionString'], // Fields read-only when item has readOnlyKey
	getRowId = (item) => (item.id as string) || crypto.randomUUID(),
}: RHFTableProps<T>) {
	const { control } = useFormContext()
	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingIndex, setEditingIndex] = useState<number | null>(null)
	const [editingItem, setEditingItem] = useState<T | null>(null)
	const [formData, setFormData] = useState<Record<string, string>>({})

	const resetForm = () => {
		setFormData({})
		setEditingIndex(null)
		setEditingItem(null)
	}

	const openAddDialog = () => {
		resetForm()
		setDialogOpen(true)
	}

	const openEditDialog = (item: T, index: number) => {
		const data: Record<string, string> = {}
		columns.forEach((col) => {
			data[col.key] = String(item[col.key] ?? '')
		})
		setFormData(data)
		setEditingIndex(index)
		setEditingItem(item)
		setDialogOpen(true)
	}

	const mapColumnsToDataTable = (): DataTableColumn<T>[] => {
		return columns.map((col) => {
			if (col.type === 'code') {
				return {
					type: 'code' as const,
					header: col.header,
					accessorKey: col.key,
					format: (value: unknown) => {
						const str = String(value || '')
						// Mask connection strings
						if (col.key.toLowerCase().includes('connection')) {
							return str.replace(/\/\/[^:]+:[^@]+@/, '//*****:*****@')
						}
						return str
					},
				}
			}
			if (col.type === 'status') {
				return {
					type: 'status' as const,
					header: col.header,
					accessorKey: col.key,
					statusConfig: {
						positiveValues: [true, 'true'],
						labels: { true: 'Yes', false: 'No' },
					},
				}
			}
			if (col.type === 'badge') {
				return {
					type: 'badge' as const,
					header: col.header,
					accessorKey: col.key,
				}
			}
			return {
				type: 'text' as const,
				header: col.header,
				accessorKey: col.key,
			}
		})
	}

	return (
		<FormField
			name={name}
			control={control}
			render={({ field }) => {
				const items: T[] = field.value || []

				const handleSubmit = () => {
					if (editingIndex !== null) {
						// Update existing item
						const newItems = [...items]
						newItems[editingIndex] = {
							...newItems[editingIndex],
							...formData,
						} as T
						field.onChange(newItems)
					} else {
						// Add new item
						const newItem = {
							id: crypto.randomUUID(),
							...formData,
							isDefault: items.length === 0,
						} as unknown as T
						field.onChange([...items, newItem])
					}
					setDialogOpen(false)
					resetForm()
				}

				const handleDelete = (index: number) => {
					const newItems = items.filter((_, i) => i !== index)
					field.onChange(newItems)
				}

				const handleSetDefault = (index: number) => {
					const newItems = items.map((item, i) => ({
						...item,
						isDefault: i === index,
					}))
					field.onChange(newItems)
				}

				const rowActions: DataTableRowAction<T>[] = [
					{
						label: 'Edit',
						onSelect: (row) => {
							const index = items.findIndex(
								(item) => getRowId(item) === getRowId(row),
							)
							if (index !== -1) {
								openEditDialog(row, index)
							}
						},
					},
					{
						label: 'Set as Default',
						onSelect: (row) => {
							const index = items.findIndex(
								(item) => getRowId(item) === getRowId(row),
							)
							if (index !== -1) {
								handleSetDefault(index)
							}
						},
					},
					{
						label: 'Delete',
						destructive: true,
						onSelect: (row) => {
							const index = items.findIndex(
								(item) => getRowId(item) === getRowId(row),
							)
							if (index !== -1 && !row[readOnlyKey]) {
								handleDelete(index)
							}
						},
					},
				]

				const tableColumns = mapColumnsToDataTable()

				// Add type column to show read-only badge
				const columnsWithType: DataTableColumn<T>[] = [
					...tableColumns,
					{
						type: 'custom' as const,
						header: 'Type',
						cell: (row) => {
							const item = row.original
							if (item[readOnlyKey]) {
								return <Badge variant="outline">System</Badge>
							}
							if (item.isDefault) {
								return <Badge variant="secondary">Default</Badge>
							}
							return null
						},
					},
				]

				return (
					<FormItem className={cn('space-y-4', formItemClassName)}>
						<div className="flex items-center justify-between">
							<div>
								{label && <FormLabel>{label}</FormLabel>}
								{description && (
									<FormDescription>{description}</FormDescription>
								)}
							</div>
							<Button type="button" onClick={openAddDialog} size="sm">
								{addButtonLabel}
							</Button>
						</div>
						<FormControl>
							<DataTable
								data={items}
								columns={columnsWithType}
								getRowId={(row) => getRowId(row)}
								options={{
									rowActions: {
										items: rowActions,
									},
								}}
								enablePagination={false}
								showCount={false}
							/>
						</FormControl>
						<FormMessage />

						<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>
										{editingIndex !== null ? editDialogTitle : addDialogTitle}
									</DialogTitle>
									<DialogDescription>{dialogDescription}</DialogDescription>
								</DialogHeader>
								<div className="space-y-4 py-4">
									{columns.map((col) => {
										// Skip internal fields like isDefault, isLocal, id
										if (
											col.key === 'isDefault' ||
											col.key === 'isLocal' ||
											col.key === 'id'
										) {
											return null
										}

										// Check if this field should be read-only for the current item
										const isFieldReadOnly =
											Boolean(editingItem?.[readOnlyKey]) &&
											readOnlyFields.includes(col.key)

										return (
											<div key={col.key} className="space-y-2">
												<Label htmlFor={col.key}>{col.header}</Label>
												{col.key.toLowerCase().includes('description') ? (
													<Textarea
														id={col.key}
														value={formData[col.key] || ''}
														onChange={(e) =>
															setFormData((prev) => ({
																...prev,
																[col.key]: e.target.value,
															}))
														}
														placeholder={`Enter ${col.header.toLowerCase()}...`}
														disabled={isFieldReadOnly}
													/>
												) : (
													<Input
														id={col.key}
														type={
															col.key.toLowerCase().includes('connection')
																? 'password'
																: 'text'
														}
														value={formData[col.key] || ''}
														onChange={(e) =>
															setFormData((prev) => ({
																...prev,
																[col.key]: e.target.value,
															}))
														}
														placeholder={
															isFieldReadOnly
																? 'Set by server configuration'
																: `Enter ${col.header.toLowerCase()}...`
														}
														disabled={isFieldReadOnly}
													/>
												)}
												{isFieldReadOnly && (
													<p className="text-xs text-muted-foreground">
														This field is managed by the server configuration
													</p>
												)}
											</div>
										)
									})}
								</div>
								<DialogFooter>
									<Button
										type="button"
										variant="outline"
										onClick={() => setDialogOpen(false)}
									>
										Cancel
									</Button>
									<Button type="button" onClick={handleSubmit}>
										{editingIndex !== null ? 'Save Changes' : 'Add'}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</FormItem>
				)
			}}
		/>
	)
}
