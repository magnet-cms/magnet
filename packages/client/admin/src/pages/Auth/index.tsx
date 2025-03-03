import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { match } from 'ts-pattern'

import { Loader } from '~/components/Loader'
import { useStatus } from '~/hooks/useAuth'

import { Login } from './components/Login'
import { Setup } from './components/Setup'

const Auth = () => {
	const navigate = useNavigate()
	const [hasSetup, setHasSetup] = useState<boolean | null>(null)

	const { data: status } = useStatus()

	const authContent = match(hasSetup)
		.with(true, () => <Login />)
		.with(false, () => <Setup />)
		.otherwise(() => <Loader />)

	useEffect(() => {
		if (status?.authenticated) {
			navigate('/')
		}

		if (status?.requiresSetup) {
			setHasSetup(false)
		} else {
			setHasSetup(true)
		}
	}, [status])

	return authContent
}

export default Auth
