'use client'

import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@magnet-cms/ui'
import { Copy, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useVaultSecret } from '~/hooks/useVault'
import { useAppIntl } from '~/i18n'

interface MaskedSecretCellProps {
	/** Secret name (key) used to fetch the value when revealed */
	secretName: string
}

/**
 * Table cell that shows a secret as masked (••••) with eye toggle to reveal
 * and copy-to-clipboard on hover when revealed. Fetches the secret only when
 * the user clicks reveal to avoid unnecessary API calls.
 */
export function MaskedSecretCell({ secretName }: MaskedSecretCellProps) {
	const intl = useAppIntl()
	const [revealed, setRevealed] = useState(false)
	const { data, isLoading } = useVaultSecret(revealed ? secretName : '')

	const value = data?.value ?? ''
	const displayValue = revealed ? (isLoading ? '' : value) : '••••••••••••'

	const handleCopy = (e: React.MouseEvent) => {
		e.stopPropagation()
		if (!value) return
		void navigator.clipboard.writeText(value).then(() => {
			toast.success(
				intl.formatMessage({
					id: 'vault.secrets.copiedToClipboard',
					defaultMessage: 'Copied to clipboard',
				}),
			)
		})
	}

	return (
		<div className="flex items-center gap-1.5 min-w-0 max-w-[280px]">
			<span className="font-mono text-sm text-gray-700 truncate shrink min-w-0">
				{isLoading ? (
					<Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
				) : (
					displayValue
				)}
			</span>
			<div className="flex items-center gap-0.5 shrink-0">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
					onClick={(e) => {
						e.stopPropagation()
						setRevealed((v) => !v)
					}}
					aria-label={
						revealed
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
					{revealed ? (
						<EyeOff className="w-3.5 h-3.5" />
					) : (
						<Eye className="w-3.5 h-3.5" />
					)}
				</Button>
				{revealed && !isLoading && value && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
								onClick={handleCopy}
								aria-label={intl.formatMessage({
									id: 'vault.secrets.copyToClipboard',
									defaultMessage: 'Copy to clipboard',
								})}
							>
								<Copy className="w-3.5 h-3.5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="top">
							{intl.formatMessage({
								id: 'vault.secrets.copyToClipboard',
								defaultMessage: 'Copy to clipboard',
							})}
						</TooltipContent>
					</Tooltip>
				)}
			</div>
		</div>
	)
}
