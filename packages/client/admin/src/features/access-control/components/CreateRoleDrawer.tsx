import { FormDrawer, RHFText, RHFTextarea } from '@magnet-cms/ui'
import { ShieldCheck } from 'lucide-react'
import { z } from 'zod'

const createRoleSchema = z.object({
	name: z
		.string()
		.min(2, 'Role name must be at least 2 characters')
		.max(50, 'Role name must be at most 50 characters')
		.regex(
			/^[a-z][a-z0-9-]*$/,
			'Must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens',
		),
	displayName: z
		.string()
		.min(2, 'Display name must be at least 2 characters')
		.max(100, 'Display name must be at most 100 characters'),
	description: z
		.string()
		.max(500, 'Description must be at most 500 characters')
		.optional(),
})

type CreateRoleFormValues = z.infer<typeof createRoleSchema>

interface CreateRoleDrawerProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onCreate: (data: {
		name: string
		displayName: string
		description?: string
	}) => void
}

export function CreateRoleDrawer({
	open,
	onOpenChange,
	onCreate,
}: CreateRoleDrawerProps) {
	const handleSubmit = (data: CreateRoleFormValues) => {
		onCreate({
			name: data.name.trim(),
			displayName: data.displayName.trim(),
			description: data.description?.trim() || undefined,
		})
	}

	return (
		<FormDrawer
			open={open}
			onOpenChange={onOpenChange}
			title="Create New Role"
			description="Create a new role to manage user permissions. The role name must be a lowercase slug."
			submitLabel="Create Role"
			submitIcon={ShieldCheck}
			onSubmit={handleSubmit}
			schema={createRoleSchema}
			defaultValues={{ name: '', displayName: '', description: '' }}
		>
			<RHFText
				name="name"
				label="Role Name (slug)"
				placeholder="e.g. content-editor"
				description="Lowercase letters, numbers, and hyphens only"
			/>
			<RHFText
				name="displayName"
				label="Display Name"
				placeholder="e.g. Content Editor"
			/>
			<RHFTextarea
				name="description"
				label="Description (Optional)"
				placeholder="Describe what this role is for..."
			/>
		</FormDrawer>
	)
}
