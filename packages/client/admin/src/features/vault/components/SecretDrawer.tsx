'use client'

import {
	Button,
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from '@magnet-cms/ui'
import { Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useVaultSetSecret } from '~/hooks/useVault'
import { useAppIntl } from '~/i18n'

interface SecretDrawerProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** When provided, the drawer is in "edit" mode for that key */
	editKey?: string
	/** Pre-filled data when editing */
	initialData?: Record<string, unknown>
}

export function SecretDrawer({
	open,
	onOpenChange,
	editKey,
	initialData,
}: SecretDrawerProps) {
	const intl = useAppIntl()
	const isEditing = Boolean(editKey)

	const [key, setKey] = useState(editKey ?? '')
	const [jsonValue, setJsonValue] = useState(
		initialData ? JSON.stringify(initialData, null, 2) : '',
	)
	const [jsonError, setJsonError] = useState<string | null>(null)

	const { mutate: setSecret, isPending } = useVaultSetSecret()

	useEffect(() => {
		if (open) {
			setKey(editKey ?? '')
			setJsonValue(initialData ? JSON.stringify(initialData, null, 2) : '')
			setJsonError(null)
		}
	}, [open, editKey, initialData])

	const handleJsonChange = (value: string) => {
		setJsonValue(value)
		if (!value.trim()) {
			setJsonError(null)
			return
		}
		try {
			JSON.parse(value)
			setJsonError(null)
		} catch {
			setJsonError(
				intl.formatMessage({
					id: 'vault.drawer.invalidJson',
					defaultMessage: 'Invalid JSON format',
				}),
			)
		}
	}

	const handleSubmit = () => {
		if (!key.trim()) return
		if (jsonError) return

		let data: Record<string, unknown>
		try {
			data = JSON.parse(jsonValue) as Record<string, unknown>
		} catch {
			setJsonError(
				intl.formatMessage({
					id: 'vault.drawer.invalidJson',
					defaultMessage: 'Invalid JSON format',
				}),
			)
			return
		}

		setSecret(
			{ key: key.trim(), data },
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

	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="flex flex-col h-full w-full sm:w-[480px] ml-auto">
				<DrawerHeader className="border-b border-gray-200">
					<DrawerTitle className="flex items-center gap-2">
						<Lock className="w-4 h-4 text-gray-500" />
						{isEditing
							? intl.formatMessage({
									id: 'vault.drawer.editTitle',
									defaultMessage: 'Edit Secret',
								})
							: intl.formatMessage({
									id: 'vault.drawer.createTitle',
									defaultMessage: 'New Secret',
								})}
					</DrawerTitle>
					<DrawerDescription>
						All values are encrypted before storage using AES-256-GCM.
					</DrawerDescription>
				</DrawerHeader>

				<div className="flex-1 overflow-y-auto p-6 space-y-5">
					{/* Key field */}
					<div>
						<label
							htmlFor="secret-key"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							{intl.formatMessage({
								id: 'vault.drawer.keyLabel',
								defaultMessage: 'Key',
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
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
						/>
						<p className="text-xs text-gray-500 mt-1">
							{intl.formatMessage({
								id: 'vault.drawer.keyHint',
								defaultMessage:
									'Use a short, descriptive key. Cannot be changed after creation.',
							})}
						</p>
					</div>

					{/* JSON data field */}
					<div>
						<label
							htmlFor="secret-data"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							{intl.formatMessage({
								id: 'vault.drawer.dataLabel',
								defaultMessage: 'Secret Data (JSON)',
							})}
						</label>
						<textarea
							id="secret-data"
							value={jsonValue}
							onChange={(e) => handleJsonChange(e.target.value)}
							rows={10}
							placeholder={intl.formatMessage({
								id: 'vault.drawer.dataPlaceholder',
								defaultMessage:
									'{ "apiKey": "sk-...", "endpoint": "https://..." }',
							})}
							className={`w-full rounded-md border px-3 py-2 text-sm font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y ${
								jsonError ? 'border-red-400' : 'border-gray-300'
							}`}
						/>
						{jsonError && (
							<p className="text-xs text-red-600 mt-1">{jsonError}</p>
						)}
						<p className="text-xs text-gray-500 mt-1">
							{intl.formatMessage({
								id: 'vault.drawer.dataHint',
								defaultMessage:
									'Enter a JSON object. All values are encrypted before storage.',
							})}
						</p>
					</div>
				</div>

				<DrawerFooter className="border-t border-gray-200">
					<div className="flex gap-2 justify-end">
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button
							onClick={handleSubmit}
							disabled={
								isPending ||
								!key.trim() ||
								!jsonValue.trim() ||
								Boolean(jsonError)
							}
						>
							{isPending ? 'Saving...' : 'Save Secret'}
						</Button>
					</div>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	)
}
