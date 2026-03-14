import { FormDrawer, RHFText } from '@magnet-cms/ui'
import { FolderPlus } from 'lucide-react'
import { z } from 'zod'
import { useAppIntl } from '~/i18n'

const newFolderSchema = z.object({
	name: z.string().min(1, 'Folder name is required'),
})

type NewFolderFormValues = z.infer<typeof newFolderSchema>

interface NewFolderDrawerProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onCreate: (name: string) => void
}

export function NewFolderDrawer({
	open,
	onOpenChange,
	onCreate,
}: NewFolderDrawerProps) {
	const intl = useAppIntl()
	const handleSubmit = (data: NewFolderFormValues) => {
		onCreate(data.name.trim())
	}

	return (
		<FormDrawer
			open={open}
			onOpenChange={onOpenChange}
			title={intl.formatMessage({
				id: 'media.newFolderDrawer.title',
				defaultMessage: 'New Folder',
			})}
			description={intl.formatMessage({
				id: 'media.newFolderDrawer.description',
				defaultMessage: 'Create a new folder to organize your assets.',
			})}
			submitLabel={intl.formatMessage({
				id: 'media.newFolderDrawer.submitLabel',
				defaultMessage: 'Create Folder',
			})}
			submitIcon={FolderPlus}
			onSubmit={handleSubmit}
			schema={newFolderSchema}
			defaultValues={{ name: '' }}
		>
			<RHFText
				name="name"
				label={intl.formatMessage({
					id: 'media.newFolderDrawer.folderName',
					defaultMessage: 'Folder Name',
				})}
				placeholder={intl.formatMessage({
					id: 'media.newFolderDrawer.placeholder',
					defaultMessage: 'e.g. Product Images',
				})}
			/>
		</FormDrawer>
	)
}
