import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	Badge,
	Button,
	DataTable,
	type DataTableColumn,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
	Spinner,
	Textarea,
} from '@magnet/ui/components'
import { CheckCircle, Plus, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Head } from '~/components/Head'
import {
	type Environment,
	useEnvironments,
	useTestConnection,
	useUpdateEnvironments,
} from '~/hooks/useEnvironment'

const maskConnectionString = (connectionString: string) => {
	return connectionString.replace(/\/\/[^:]+:[^@]+@/, '//*****:*****@')
}

const EnvironmentsSettings = () => {
	const { data: environments = [], isLoading } = useEnvironments()
	const updateEnvironments = useUpdateEnvironments()
	const testConnection = useTestConnection()

	const [dialogOpen, setDialogOpen] = useState(false)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [editingEnvironment, setEditingEnvironment] =
		useState<Environment | null>(null)
	const [deletingEnvironment, setDeletingEnvironment] =
		useState<Environment | null>(null)

	const [formData, setFormData] = useState({
		name: '',
		connectionString: '',
		description: '',
	})

	const resetForm = () => {
		setFormData({
			name: '',
			connectionString: '',
			description: '',
		})
		setEditingEnvironment(null)
	}

	const openCreateDialog = () => {
		resetForm()
		setDialogOpen(true)
	}

	const openEditDialog = (env: Environment) => {
		if (env.isLocal) return // Cannot edit local environment
		setEditingEnvironment(env)
		setFormData({
			name: env.name,
			connectionString: env.connectionString,
			description: env.description || '',
		})
		setDialogOpen(true)
	}

	const openDeleteDialog = (env: Environment) => {
		if (env.isLocal) return // Cannot delete local environment
		setDeletingEnvironment(env)
		setDeleteDialogOpen(true)
	}

	const handleSubmit = () => {
		if (!formData.name || !formData.connectionString) {
			toast.error('Name and connection string are required')
			return
		}

		// Get custom environments (exclude local)
		const customEnvs = environments.filter((e) => !e.isLocal)

		if (editingEnvironment) {
			// Update existing environment
			const updatedEnvs = customEnvs.map((env) =>
				env.id === editingEnvironment.id ? { ...env, ...formData } : env,
			)
			updateEnvironments.mutate(updatedEnvs, {
				onSuccess: () => {
					toast.success('Environment updated')
					setDialogOpen(false)
					resetForm()
				},
				onError: (error) => {
					toast.error(`Failed to update environment: ${error.message}`)
				},
			})
		} else {
			// Create new environment
			const newEnv: Environment = {
				id: crypto.randomUUID(),
				name: formData.name,
				connectionString: formData.connectionString,
				description: formData.description,
				isDefault: customEnvs.length === 0,
			}
			updateEnvironments.mutate([...customEnvs, newEnv], {
				onSuccess: () => {
					toast.success('Environment created')
					setDialogOpen(false)
					resetForm()
				},
				onError: (error) => {
					toast.error(`Failed to create environment: ${error.message}`)
				},
			})
		}
	}

	const handleDelete = () => {
		if (!deletingEnvironment) return

		const customEnvs = environments.filter((e) => !e.isLocal)
		const updatedEnvs = customEnvs.filter(
			(env) => env.id !== deletingEnvironment.id,
		)

		updateEnvironments.mutate(updatedEnvs, {
			onSuccess: () => {
				toast.success('Environment deleted')
				setDeleteDialogOpen(false)
				setDeletingEnvironment(null)
			},
			onError: (error) => {
				toast.error(`Failed to delete environment: ${error.message}`)
			},
		})
	}

	const handleSetDefault = (env: Environment) => {
		if (env.isLocal) return // Cannot set local as default via this method

		const customEnvs = environments.filter((e) => !e.isLocal)
		const updatedEnvs = customEnvs.map((e) => ({
			...e,
			isDefault: e.id === env.id,
		}))

		updateEnvironments.mutate(updatedEnvs, {
			onSuccess: () => {
				toast.success(`${env.name} is now the default environment`)
			},
			onError: (error) => {
				toast.error(`Failed to set default: ${error.message}`)
			},
		})
	}

	const handleTestConnection = () => {
		if (!formData.connectionString) {
			toast.error('Please enter a connection string')
			return
		}

		testConnection.mutate(formData.connectionString, {
			onSuccess: (result) => {
				if (result.success) {
					toast.success('Connection successful')
				} else {
					toast.error('Connection failed')
				}
			},
			onError: () => {
				toast.error('Connection test failed')
			},
		})
	}

	const columns: DataTableColumn<Environment>[] = [
		{
			type: 'custom',
			header: 'Name',
			cell: (row) => (
				<div className="flex items-center gap-2">
					<span className="font-medium">{row.original.name}</span>
					{row.original.isDefault && <Badge variant="secondary">Default</Badge>}
					{row.original.isLocal && <Badge variant="outline">System</Badge>}
				</div>
			),
		},
		{
			type: 'custom',
			header: 'Connection String',
			cell: (row) => (
				<code className="text-xs text-muted-foreground">
					{maskConnectionString(row.original.connectionString)}
				</code>
			),
		},
		{
			type: 'text',
			header: 'Description',
			accessorKey: 'description',
		},
	]

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Spinner />
			</div>
		)
	}

	return (
		<div className="flex flex-col w-full min-h-0">
			<Head
				title="Environments"
				actions={
					<Button onClick={openCreateDialog}>
						<Plus className="h-4 w-4 mr-2" />
						Add Environment
					</Button>
				}
			/>

			<div className="flex-1 overflow-y-auto p-6">
				<div className="max-w-5xl mx-auto">
					<DataTable
						data={environments}
						columns={columns}
						getRowId={(row) => row.id}
						options={{
							rowActions: {
								items: [
									{
										label: 'Edit',
										onSelect: (row) => openEditDialog(row),
									},
									{
										label: 'Set as Default',
										onSelect: (row) => handleSetDefault(row),
									},
									{
										label: 'Delete',
										onSelect: (row) => openDeleteDialog(row),
										destructive: true,
									},
								],
							},
						}}
						enablePagination={false}
						showCount={false}
					/>
				</div>
			</div>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editingEnvironment ? 'Edit Environment' : 'Add Environment'}
						</DialogTitle>
						<DialogDescription>
							Configure a database environment for your application.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								placeholder="e.g., Development, Production"
								value={formData.name}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, name: e.target.value }))
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="connectionString">Connection String</Label>
							<div className="flex gap-2">
								<Input
									id="connectionString"
									type="password"
									placeholder="mongodb://..."
									value={formData.connectionString}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											connectionString: e.target.value,
										}))
									}
									className="flex-1"
								/>
								<Button
									type="button"
									variant="outline"
									onClick={handleTestConnection}
									disabled={testConnection.isPending}
								>
									{testConnection.isPending ? (
										<div className="h-4 w-4 flex items-center justify-center scale-50">
											<Spinner />
										</div>
									) : testConnection.data?.success ? (
										<CheckCircle className="h-4 w-4 text-green-500" />
									) : testConnection.data?.success === false ? (
										<XCircle className="h-4 w-4 text-red-500" />
									) : (
										'Test'
									)}
								</Button>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="description">Description (optional)</Label>
							<Textarea
								id="description"
								placeholder="Describe this environment..."
								value={formData.description}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										description: e.target.value,
									}))
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleSubmit}
							disabled={updateEnvironments.isPending}
						>
							{updateEnvironments.isPending
								? 'Saving...'
								: editingEnvironment
									? 'Save Changes'
									: 'Create Environment'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Environment</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{deletingEnvironment?.name}"?
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

export default EnvironmentsSettings
