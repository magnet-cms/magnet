import { useDialog } from '@magnet-cms/admin'
import { Button, Switch } from '@magnet-cms/ui/components'
import { useEffect } from 'react'
import { useSchemaBuilder } from '../hooks/useSchemaBuilder'

/**
 * Schema Options Content - rendered inside the dialog
 */
function SchemaOptionsContent({ onClose }: { onClose: () => void }) {
	const { state, updateSchema } = useSchemaBuilder()

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<label
						htmlFor="versioning"
						className="text-sm font-medium cursor-pointer"
					>
						Enable Versioning
					</label>
					<p className="text-xs text-muted-foreground">
						Track content changes with version history
					</p>
				</div>
				<Switch
					id="versioning"
					checked={state.schema.versioning}
					onCheckedChange={(checked) => updateSchema({ versioning: checked })}
				/>
			</div>

			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<label htmlFor="i18n" className="text-sm font-medium cursor-pointer">
						Enable i18n
					</label>
					<p className="text-xs text-muted-foreground">
						Support multiple languages for content
					</p>
				</div>
				<Switch
					id="i18n"
					checked={state.schema.i18n}
					onCheckedChange={(checked) => updateSchema({ i18n: checked })}
				/>
			</div>

			<div className="flex justify-end pt-2">
				<Button variant="outline" onClick={onClose}>
					Close
				</Button>
			</div>
		</div>
	)
}

/**
 * Hook to show schema options dialog
 */
export function useSchemaOptionsDialog() {
	const { showDialog, closeDialog } = useDialog()

	return {
		open: () => {
			showDialog({
				title: 'Schema Options',
				description:
					'Configure schema-level settings for versioning and internationalization.',
				size: 'md',
				content: <SchemaOptionsContent onClose={closeDialog} />,
			})
		},
		close: closeDialog,
	}
}

/**
 * Legacy component wrapper for backwards compatibility
 */
interface SchemaOptionsDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function SchemaOptionsDialog({
	open,
	onOpenChange,
}: SchemaOptionsDialogProps) {
	const schemaOptions = useSchemaOptionsDialog()

	useEffect(() => {
		if (open) {
			schemaOptions.open()
		}
	}, [open, schemaOptions])

	// When dialog closes via the service, notify parent
	useEffect(() => {
		// This is a simplified approach - the dialog service handles closing
		return () => {
			if (open) {
				onOpenChange(false)
			}
		}
	}, [open, onOpenChange])

	return null // Dialog is rendered by DialogProvider in admin
}
