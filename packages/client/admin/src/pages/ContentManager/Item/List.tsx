import { Button } from '@magnet/ui/components'
import { names } from '@magnet/ui/lib'
import { useNavigate, useParams } from 'react-router-dom'
import { Head } from '~/components/Head'

const ContentManagerList = () => {
	const { schema } = useParams()
	const navigate = useNavigate()

	const name = names(String(schema))

	return (
		<>
			<Head
				title={name.title}
				actions={
					<Button onClick={() => navigate(`/content-manager/${schema}/create`)}>
						Create
					</Button>
				}
			/>
		</>
	)
}

export default ContentManagerList
