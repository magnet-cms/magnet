import { FormDrawer, RHFText } from '@magnet-cms/ui'
import { Key } from 'lucide-react'
import { z } from 'zod'
import { useAppIntl } from '~/i18n'

const createApiKeySchema = z.object({
	name: z.string().min(1, 'Key name is required'),
	expiresAt: z.string().optional(),
})

type CreateApiKeyFormValues = z.infer<typeof createApiKeySchema>

interface CreateApiKeyDrawerProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onCreate: (data: { name: string; expiresAt: string | null }) => void
}

export function CreateApiKeyDrawer({
	open,
	onOpenChange,
	onCreate,
}: CreateApiKeyDrawerProps) {
	const intl = useAppIntl()
	const handleSubmit = (data: CreateApiKeyFormValues) => {
		onCreate({
			name: data.name.trim(),
			expiresAt: data.expiresAt?.trim() || null,
		})
	}

	return (
		<FormDrawer
			open={open}
			onOpenChange={onOpenChange}
			title={intl.formatMessage({
				id: 'apiKeys.createDrawer.title',
				defaultMessage: 'Create New API Key',
			})}
			description={intl.formatMessage({
				id: 'apiKeys.createDrawer.description',
				defaultMessage:
					"Create a new API key to authenticate requests to your application. Make sure to copy it immediately as it won't be shown again.",
			})}
			submitLabel={intl.formatMessage({
				id: 'apiKeys.createDrawer.submitLabel',
				defaultMessage: 'Create API Key',
			})}
			submitIcon={Key}
			onSubmit={handleSubmit}
			schema={createApiKeySchema}
			defaultValues={{ name: '', expiresAt: '' }}
		>
			<RHFText
				name="name"
				label={intl.formatMessage({
					id: 'apiKeys.createDrawer.keyName',
					defaultMessage: 'Key Name',
				})}
				placeholder={intl.formatMessage({
					id: 'apiKeys.createDrawer.keyNamePlaceholder',
					defaultMessage: 'e.g. Production API Key',
				})}
			/>
			<RHFText
				name="expiresAt"
				label={intl.formatMessage({
					id: 'apiKeys.createDrawer.expirationDate',
					defaultMessage: 'Expiration Date (Optional)',
				})}
				type="date"
				description={intl.formatMessage({
					id: 'apiKeys.createDrawer.expirationHint',
					defaultMessage: 'Leave empty for keys that never expire',
				})}
			/>
		</FormDrawer>
	)
}
