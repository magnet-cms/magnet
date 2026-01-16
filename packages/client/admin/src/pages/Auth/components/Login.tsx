import { zodResolver } from '@hookform/resolvers/zod'
import { Button, FormProvider, RHFText } from '@magnet-cms/ui/components'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useLogin } from '~/hooks/useAuth'

const schema = z.object({
	email: z.string().email(),
	password: z.string().min(1, 'Password is required'),
})

type Inputs = z.infer<typeof schema>

export const Login = () => {
	const navigate = useNavigate()
	const { mutate: login, isPending, error } = useLogin()

	const methods = useForm<Inputs>({
		defaultValues: { email: '', password: '' },
		resolver: zodResolver(schema),
	})

	const onSubmit = ({ email, password }: Inputs) => {
		login(
			{ email, password },
			{
				onSuccess: () => {
					navigate('/')
				},
			},
		)
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col">
				<h1 className="text-2xl font-semibold tracking-tight">
					Login to your account
				</h1>
				<p className="text-sm text-muted-foreground">
					Enter your credentials below to login
				</p>
			</div>

			<FormProvider<Inputs>
				className="flex flex-col text-start gap-4"
				onSubmit={onSubmit}
				{...methods}
			>
				<RHFText name="email" label="Email" />
				<RHFText type="password" name="password" label="Password" />
				{error && <p className="text-red-500 text-sm">{error.message}</p>}
				<Button
					type="submit"
					variant="default"
					className="w-full mt-2"
					disabled={isPending}
				>
					{isPending ? 'Logging in...' : 'Login'}
				</Button>
			</FormProvider>
		</div>
	)
}
