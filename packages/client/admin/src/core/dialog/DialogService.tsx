/**
 * Dialog Service - Centralized dialog management for plugins
 *
 * Plugins can use this service to show dialogs without embedding
 * Dialog components directly. This ensures proper styling.
 */

import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@magnet-cms/ui/components'
import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react'

/**
 * Dialog configuration options
 */
export interface DialogOptions {
	title: string
	description?: string
	content: ReactNode
	size?: 'sm' | 'md' | 'lg' | 'xl'
	footer?: ReactNode
	onClose?: () => void
}

/**
 * Confirm dialog options
 */
export interface ConfirmOptions {
	title: string
	description: string
	confirmLabel?: string
	cancelLabel?: string
	variant?: 'default' | 'destructive'
	onConfirm: () => void | Promise<void>
	onCancel?: () => void
}

interface DialogState {
	open: boolean
	options: DialogOptions | null
}

interface ConfirmState {
	open: boolean
	options: ConfirmOptions | null
	loading: boolean
}

interface DialogContextValue {
	showDialog: (options: DialogOptions) => void
	closeDialog: () => void
	showConfirm: (options: ConfirmOptions) => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

const SIZE_CLASSES = {
	sm: 'sm:max-w-sm',
	md: 'sm:max-w-md',
	lg: 'sm:max-w-lg',
	xl: 'sm:max-w-xl',
}

/**
 * Dialog Provider - Wrap your app with this to enable dialog service
 */
export function DialogProvider({ children }: { children: ReactNode }) {
	const [dialogState, setDialogState] = useState<DialogState>({
		open: false,
		options: null,
	})

	const [confirmState, setConfirmState] = useState<ConfirmState>({
		open: false,
		options: null,
		loading: false,
	})

	const showDialog = useCallback((options: DialogOptions) => {
		setDialogState({ open: true, options })
	}, [])

	const closeDialog = useCallback(() => {
		const onClose = dialogState.options?.onClose
		setDialogState({ open: false, options: null })
		onClose?.()
	}, [dialogState.options])

	const showConfirm = useCallback((options: ConfirmOptions) => {
		setConfirmState({ open: true, options, loading: false })
	}, [])

	const handleConfirm = useCallback(async () => {
		if (!confirmState.options) return

		setConfirmState((s) => ({ ...s, loading: true }))
		try {
			await confirmState.options.onConfirm()
			setConfirmState({ open: false, options: null, loading: false })
		} catch {
			setConfirmState((s) => ({ ...s, loading: false }))
		}
	}, [confirmState.options])

	const handleCancel = useCallback(() => {
		confirmState.options?.onCancel?.()
		setConfirmState({ open: false, options: null, loading: false })
	}, [confirmState.options])

	// Set ref for imperative access
	useEffect(() => {
		setDialogRef({ showDialog, closeDialog, showConfirm })
		return () => setDialogRef(null)
	}, [showDialog, closeDialog, showConfirm])

	return (
		<DialogContext.Provider value={{ showDialog, closeDialog, showConfirm }}>
			{children}

			{/* Custom Dialog */}
			<Dialog
				open={dialogState.open}
				onOpenChange={(open) => !open && closeDialog()}
			>
				{dialogState.options && (
					<DialogContent
						className={SIZE_CLASSES[dialogState.options.size || 'md']}
					>
						<DialogHeader>
							<DialogTitle>{dialogState.options.title}</DialogTitle>
							{dialogState.options.description && (
								<DialogDescription>
									{dialogState.options.description}
								</DialogDescription>
							)}
						</DialogHeader>
						<div className="py-4">{dialogState.options.content}</div>
						{dialogState.options.footer && (
							<DialogFooter>{dialogState.options.footer}</DialogFooter>
						)}
					</DialogContent>
				)}
			</Dialog>

			{/* Confirm Dialog */}
			<Dialog
				open={confirmState.open}
				onOpenChange={(open) => !open && handleCancel()}
			>
				{confirmState.options && (
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle>{confirmState.options.title}</DialogTitle>
							<DialogDescription>
								{confirmState.options.description}
							</DialogDescription>
						</DialogHeader>
						<DialogFooter className="gap-2 sm:gap-0">
							<Button
								variant="outline"
								onClick={handleCancel}
								disabled={confirmState.loading}
							>
								{confirmState.options.cancelLabel || 'Cancel'}
							</Button>
							<Button
								variant={confirmState.options.variant || 'default'}
								onClick={handleConfirm}
								disabled={confirmState.loading}
							>
								{confirmState.loading
									? 'Loading...'
									: confirmState.options.confirmLabel || 'Confirm'}
							</Button>
						</DialogFooter>
					</DialogContent>
				)}
			</Dialog>
		</DialogContext.Provider>
	)
}

/**
 * Hook to access dialog service
 */
export function useDialog(): DialogContextValue {
	const context = useContext(DialogContext)
	if (!context) {
		throw new Error('useDialog must be used within DialogProvider')
	}
	return context
}

// Store reference for imperative access
let dialogRef: DialogContextValue | null = null

/**
 * Set the dialog reference (called by DialogProvider)
 */
export function setDialogRef(ref: DialogContextValue | null) {
	dialogRef = ref
}

/**
 * Imperative dialog functions for use outside React components
 */
export const dialog = {
	show: (options: DialogOptions) => {
		if (!dialogRef) {
			console.error('[Dialog] DialogProvider not mounted')
			return
		}
		dialogRef.showDialog(options)
	},
	close: () => {
		dialogRef?.closeDialog()
	},
	confirm: (options: ConfirmOptions) => {
		if (!dialogRef) {
			console.error('[Dialog] DialogProvider not mounted')
			return
		}
		dialogRef.showConfirm(options)
	},
}
