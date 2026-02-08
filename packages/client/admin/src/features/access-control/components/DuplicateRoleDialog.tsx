import { FormDrawer, RHFText } from '@magnet-cms/ui'
import { Copy } from 'lucide-react'
import { z } from 'zod'

const duplicateRoleSchema = z.object({
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
		.max(100, 'Display name must be at most 100 characters')
		.optional(),
})

type DuplicateRoleFormValues = z.infer<typeof duplicateRoleSchema>

interface DuplicateRoleDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	sourceRoleName: string
	onDuplicate: (data: { name: string; displayName?: string }) => void
}

export function DuplicateRoleDialog({
	open,
	onOpenChange,
	sourceRoleName,
	onDuplicate,
}: DuplicateRoleDialogProps) {
	const handleSubmit = (data: DuplicateRoleFormValues) => {
		onDuplicate({
			name: data.name.trim(),
			displayName: data.displayName?.trim() || undefined,
		})
	}

	return (
		<FormDrawer
			open={open}
			onOpenChange={onOpenChange}
			title="Duplicate Role"
			description={`Create a copy of the "${sourceRoleName}" role with all its permissions.`}
			submitLabel="Duplicate Role"
			submitIcon={Copy}
			onSubmit={handleSubmit}
			schema={duplicateRoleSchema}
			defaultValues={{
				name: '',
				displayName: `Copy of ${sourceRoleName}`,
			}}
		>
			<RHFText
				name="name"
				label="New Role Name (slug)"
				placeholder="e.g. content-editor-copy"
				description="Lowercase letters, numbers, and hyphens only"
			/>
			<RHFText
				name="displayName"
				label="Display Name (Optional)"
				placeholder={`Copy of ${sourceRoleName}`}
			/>
		</FormDrawer>
	)
}
