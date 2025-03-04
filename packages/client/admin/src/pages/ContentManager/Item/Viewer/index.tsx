import { names } from '@magnet/ui/lib'
import { Outlet, useParams } from 'react-router-dom'
import { Head } from '~/components/Head'

const actions = [
	{
		label: 'Edit',
		to: '',
		default: true,
	},
	// {
	// 	label: 'Live Preview',
	// 	to: 'live-preview',
	// },
	{
		label: 'Versions',
		to: 'versions',
	},
	{
		label: 'API',
		to: 'api',
	},
]

const ContentManagerViewer = () => {
	const { schema } = useParams()

	const name = names(String(schema))

	return (
		<>
			<Head
				title={name.title}
				actions={{
					grouped: true,
					items: actions,
				}}
			/>
			<Outlet />
		</>
	)
}

export default ContentManagerViewer
