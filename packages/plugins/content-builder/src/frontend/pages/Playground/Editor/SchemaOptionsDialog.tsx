import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Switch,
} from '@magnet/ui/components'
import { useSchemaBuilder } from '../hooks/useSchemaBuilder'

interface SchemaOptionsDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function SchemaOptionsDialog({
	open,
	onOpenChange,
}: SchemaOptionsDialogProps) {
	const { state, updateSchema } = useSchemaBuilder()

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Schema Options</DialogTitle>
					<DialogDescription>
						Configure schema-level settings for versioning and
						internationalization.
					</DialogDescription>
				</DialogHeader>

				<div className="py-4 space-y-4">
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
							onCheckedChange={(checked) =>
								updateSchema({ versioning: checked })
							}
						/>
					</div>

					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<label
								htmlFor="i18n"
								className="text-sm font-medium cursor-pointer"
							>
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
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
