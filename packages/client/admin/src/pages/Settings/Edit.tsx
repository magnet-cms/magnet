import { type SchemaMetadata } from '@magnet/common'
import { Button, Spinner } from '@magnet/ui/components'
import { names } from '@magnet/utils'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FormBuilder } from '~/components/FormBuilder'
import { Head } from '~/components/Head'
import { useSetting } from '~/hooks/useDiscovery'
import { useSettingData, useSettingMutation } from '~/hooks/useSetting'

type SettingValue = {
	key: string
	value: unknown
	group: string
	type: string
}

const SettingsEdit = () => {
	const { group } = useParams()

	const name = names(group as string)

	// Fetch schema metadata
	const { data: schema } = useSetting(name.key)

	// Fetch actual setting values
	const { data: settingsData, isLoading: isLoadingData } =
		useSettingData<SettingValue>(name.key)

	// Mutation for updating settings
	const mutation = useSettingMutation(name.key)

	// Transform settings array to object for form initial values
	const initialValues = settingsData?.reduce<Record<string, unknown>>(
		(acc, setting) => {
			acc[setting.key] = setting.value
			return acc
		},
		{},
	)

	// Handle form submission
	const handleSubmit = (data: Record<string, unknown>) => {
		mutation.mutate(data, {
			onSuccess: () => {
				toast.success('Settings saved', {
					description: `${name.title} settings were saved successfully`,
				})
			},
			onError: (error) => {
				toast.error(`Failed to save settings: ${error.message}`)
			},
		})
	}

	// Loading state
	if (!schema || isLoadingData) {
		return (
			<div className="flex items-center justify-center h-64">
				<Spinner />
			</div>
		)
	}

	return (
		<div className="flex flex-col w-full min-h-0">
			<Head
				title={name.title}
				actions={
					<Button
						disabled={mutation.isPending}
						onClick={() => {
							const form = document.querySelector('form')
							if (form) {
								form.dispatchEvent(
									new Event('submit', { cancelable: true, bubbles: true }),
								)
							}
						}}
					>
						{mutation.isPending ? 'Saving...' : 'Save'}
					</Button>
				}
			/>

			<div className="flex-1 overflow-y-auto p-6">
				<FormBuilder
					key={name.key}
					schema={schema as SchemaMetadata}
					onSubmit={handleSubmit}
					initialValues={initialValues}
				/>
			</div>
		</div>
	)
}

export default SettingsEdit
