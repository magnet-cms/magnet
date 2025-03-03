import { zodResolver } from '@hookform/resolvers/zod'
import { Button, FormProvider, RHFText } from '@magnet/ui/components'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useRegister } from '~/hooks/useAuth'

const schema = z
	.object({
		email: z.string().email(),
		password: z.string().min(1, 'Password is required'),
		verifyPassword: z.string().min(1, 'Verify Password is required'),
	})
	.refine((data) => data.password === data.verifyPassword, {
		message: 'Passwords do not match',
		path: ['verifyPassword'],
	})

type Inputs = z.infer<typeof schema>

export const Setup = () => {
	const navigate = useNavigate()
	const { mutate: register, isPending, error } = useRegister()
	const methods = useForm<Inputs>({
		defaultValues: { email: '', password: '' },
		resolver: zodResolver(schema),
	})

	const onSubmit = async ({ email, password }: Inputs) => {
		try {
			register(
				{ email, password, name: 'New User', role: 'admin' },
				{
					onSuccess: () => {
						navigate('/')
					},
				},
			)
		} catch (error) {
			console.error('Setup error:', error)
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col">
				<h1 className="text-2xl font-semibold tracking-tight">
					Let's setup your account
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
				<RHFText
					type="password"
					name="verifyPassword"
					label="Verify Password"
				/>
				{error && <p className="text-red-500 text-sm">{error.message}</p>}
				<Button type="submit" variant="default" className="w-full mt-2">
					{isPending ? 'Setting up...' : 'Setup'}
				</Button>
			</FormProvider>
		</div>
	)
}
