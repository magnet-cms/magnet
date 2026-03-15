'use client'

import {
	Button,
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '@magnet-cms/ui'
import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useVaultSetSecret } from '~/hooks/useVault'
import { useAppIntl } from '~/i18n'

interface SecretDrawerProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** When provided, the drawer is in "edit" mode for that key */
	editKey?: string
	/** Pre-filled value when editing */
	initialValue?: string
	/** Pre-filled description when editing */
	initialDescription?: string
}

export function SecretDrawer({
	open,
	onOpenChange,
	editKey,
	initialValue,
	initialDescription,
}: SecretDrawerProps) {
	const intl = useAppIntl()
	const isEditing = Boolean(editKey)

	const [key, setKey] = useState(editKey ?? '')
	const [description, setDescription] = useState(initialDescription ?? '')
	const [value, setValue] = useState('')
	const [showValue, setShowValue] = useState(false)

	const { mutate: setSecret, isPending } = useVaultSetSecret()

	useEffect(() => {
		if (open) {
			setKey(editKey ?? '')
			setDescription(initialDescription ?? '')
			setValue('')
			setShowValue(false)
		}
	}, [open, editKey, initialDescription])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!key.trim()) return
		if (!isEditing && !value.trim()) return

		setSecret(
			{
				key: key.trim(),
				value: value.trim() || (initialValue ?? ''),
				description: description.trim() || undefined,
			},
			{
				onSuccess: () => {
					toast.success(
						intl.formatMessage({
							id: 'vault.drawer.saveSuccess',
							defaultMessage: 'Secret saved',
						}),
					)
					onOpenChange(false)
				},
				onError: (err) => {
					toast.error(
						err.message ||
							intl.formatMessage({
								id: 'vault.drawer.saveError',
								defaultMessage: 'Failed to save secret',
							}),
					)
				},
			},
		)
	}

	const handleCancel = () => {
		onOpenChange(false)
	}

	const canSubmit =
		!isPending &&
		key.trim().length > 0 &&
		(isEditing || value.trim().length > 0)

	const title = isEditing
		? intl.formatMessage({
				id: 'vault.drawer.editTitle',
				defaultMessage: 'Edit Secret',
			})
		: intl.formatMessage({
				id: 'vault.drawer.createTitle',
				defaultMessage: 'New Secret',
			})

	const descriptionText = intl.formatMessage({
		id: 'vault.drawer.description',
		defaultMessage: 'Values are encrypted before storage using AES-256-GCM.',
	})

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full sm:max-w-sm flex flex-col">
				<SheetHeader>
					<SheetTitle>{title}</SheetTitle>
					<SheetDescription>{descriptionText}</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
					<div className="flex-1 overflow-y-auto space-y-5 px-5 py-6">
						{/* Name (key) */}
						<div className="space-y-2">
							<label
								htmlFor="secret-key"
								className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								{intl.formatMessage({
									id: 'vault.drawer.keyLabel',
									defaultMessage: 'Name',
								})}
							</label>
							<input
								id="secret-key"
								type="text"
								value={key}
								onChange={(e) => setKey(e.target.value)}
								disabled={isEditing}
								placeholder={intl.formatMessage({
									id: 'vault.drawer.keyPlaceholder',
									defaultMessage: 'e.g. database, sendgrid, stripe',
								})}
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
							/>
							{!isEditing && (
								<p className="text-xs text-muted-foreground">
									{intl.formatMessage({
										id: 'vault.drawer.keyHint',
										defaultMessage:
											'Use a short, descriptive name. Cannot be changed after creation.',
									})}
								</p>
							)}
						</div>

						{/* Description */}
						<div className="space-y-2">
							<label
								htmlFor="secret-description"
								className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								{intl.formatMessage({
									id: 'vault.drawer.descriptionLabel',
									defaultMessage: 'Description',
								})}{' '}
								<span className="text-muted-foreground font-normal">
									{intl.formatMessage({
										id: 'common.optional',
										defaultMessage: '(optional)',
									})}
								</span>
							</label>
							<input
								id="secret-description"
								type="text"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder={intl.formatMessage({
									id: 'vault.drawer.descriptionPlaceholder',
									defaultMessage: 'What is this secret used for?',
								})}
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
							/>
						</div>

						{/* Secret value */}
						<div className="space-y-2">
							<label
								htmlFor="secret-value"
								className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								{intl.formatMessage({
									id: 'vault.drawer.valueLabel',
									defaultMessage: 'Secret Value',
								})}
								{isEditing && (
									<span className="ml-1 text-muted-foreground font-normal text-xs">
										{intl.formatMessage({
											id: 'vault.drawer.valueEditHint',
											defaultMessage: '(leave blank to keep existing value)',
										})}
									</span>
								)}
							</label>
							<div className="relative">
								<input
									id="secret-value"
									type={showValue ? 'text' : 'password'}
									value={value}
									onChange={(e) => setValue(e.target.value)}
									placeholder={
										isEditing
											? '••••••••••••'
											: intl.formatMessage({
													id: 'vault.drawer.valuePlaceholder',
													defaultMessage: 'Enter secret value',
												})
									}
									className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-9 text-sm font-mono shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
								/>
								<button
									type="button"
									onClick={() => setShowValue((v) => !v)}
									className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
									tabIndex={-1}
									aria-label={
										showValue
											? intl.formatMessage({
													id: 'vault.secrets.hideSecret',
													defaultMessage: 'Hide secret',
												})
											: intl.formatMessage({
													id: 'vault.secrets.revealSecret',
													defaultMessage: 'Reveal secret',
												})
									}
								>
									{showValue ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>
						</div>
					</div>

					<SheetFooter>
						<Button
							type="button"
							variant="outline"
							onClick={handleCancel}
							disabled={isPending}
						>
							{intl.formatMessage({
								id: 'common.actions.cancel',
								defaultMessage: 'Cancel',
							})}
						</Button>
						<Button type="submit" disabled={!canSubmit}>
							{isPending
								? intl.formatMessage({
										id: 'common.saving',
										defaultMessage: 'Saving...',
									})
								: intl.formatMessage({
										id: 'vault.drawer.saveButton',
										defaultMessage: 'Save Secret',
									})}
						</Button>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	)
}
