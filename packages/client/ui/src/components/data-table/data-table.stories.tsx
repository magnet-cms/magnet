import type { Meta, StoryObj } from '@storybook/react'

import { Button } from '../ui/button'
import { DataTable, type DataTableColumn } from './index'

type User = {
	id: string
	name: string
	email: string
	role: string
	status: string
}

const sampleData: User[] = [
	{
		id: '1',
		name: 'John Doe',
		email: 'john@example.com',
		role: 'Admin',
		status: 'active',
	},
	{
		id: '2',
		name: 'Jane Smith',
		email: 'jane@example.com',
		role: 'User',
		status: 'active',
	},
	{
		id: '3',
		name: 'Bob Johnson',
		email: 'bob@example.com',
		role: 'User',
		status: 'inactive',
	},
	{
		id: '4',
		name: 'Alice Williams',
		email: 'alice@example.com',
		role: 'Moderator',
		status: 'active',
	},
	{
		id: '5',
		name: 'Charlie Brown',
		email: 'charlie@example.com',
		role: 'User',
		status: 'pending',
	},
]

const columns: DataTableColumn<User>[] = [
	{
		type: 'text',
		header: 'Name',
		accessorKey: 'name',
	},
	{
		type: 'text',
		header: 'Email',
		accessorKey: 'email',
	},
	{
		type: 'text',
		header: 'Role',
		accessorKey: 'role',
	},
	{
		type: 'badge',
		header: 'Status',
		accessorKey: 'status',
	},
]

const meta = {
	title: 'Organisms/DataTable',
	component: DataTable,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof DataTable>

export default meta

export const Default: StoryObj<typeof DataTable> = {
	args: {
		data: sampleData,
		columns: columns as DataTableColumn<unknown>[],
		getRowId: (row: unknown) => (row as User).id,
	},
	render: () => (
		<div className="w-full max-w-4xl">
			<DataTable
				data={sampleData}
				columns={columns}
				getRowId={(row) => row.id}
			/>
		</div>
	),
}

export const WithActions: StoryObj<typeof DataTable> = {
	args: {
		data: sampleData,
		columns: columns as DataTableColumn<unknown>[],
		getRowId: (row: unknown) => (row as User).id,
		options: {
			rowActions: {
				items: [
					{
						label: 'Edit',
						onSelect: (row: unknown) => console.log('Edit:', row),
					},
					{
						label: 'Delete',
						onSelect: (row: unknown) => console.log('Delete:', row),
						destructive: true,
					},
				],
			},
		},
	},
	render: () => (
		<div className="w-full max-w-4xl">
			<DataTable
				data={sampleData}
				columns={columns}
				options={{
					rowActions: {
						items: [
							{
								label: 'Edit',
								onSelect: (row) => console.log('Edit:', row),
							},
							{
								label: 'Delete',
								onSelect: (row) => console.log('Delete:', row),
								destructive: true,
							},
						],
					},
				}}
				getRowId={(row) => row.id}
			/>
		</div>
	),
}

export const WithToolbar: StoryObj<typeof DataTable> = {
	args: {
		data: sampleData,
		columns: columns as DataTableColumn<unknown>[],
		getRowId: (row: unknown) => (row as User).id,
		renderToolbar: () => (
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-lg font-semibold">Users</h3>
				<Button size="sm">Add User</Button>
			</div>
		),
	},
	render: () => (
		<div className="w-full max-w-4xl">
			<DataTable
				data={sampleData}
				columns={columns}
				getRowId={(row) => row.id}
				renderToolbar={() => (
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold">Users</h3>
						<Button size="sm">Add User</Button>
					</div>
				)}
			/>
		</div>
	),
}

export const WithPagination: StoryObj<typeof DataTable> = {
	args: {
		data: sampleData,
		columns: columns as DataTableColumn<unknown>[],
		getRowId: (row: unknown) => (row as User).id,
		enablePagination: true,
		pageSizeOptions: [5, 10, 20],
	},
	render: () => (
		<div className="w-full max-w-4xl">
			<DataTable
				data={sampleData}
				columns={columns}
				getRowId={(row) => row.id}
				enablePagination
				pageSizeOptions={[5, 10, 20]}
			/>
		</div>
	),
}
