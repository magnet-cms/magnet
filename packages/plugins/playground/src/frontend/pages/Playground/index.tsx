import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Playground index - redirects to the editor with 3-column layout
 * The schema list is now integrated into the editor sidebar
 */
const Playground = () => {
	const navigate = useNavigate()

	useEffect(() => {
		// Redirect to new schema editor - the schema list is shown in the sidebar
		navigate('/playground/new', { replace: true })
	}, [navigate])

	return null
}

export default Playground
