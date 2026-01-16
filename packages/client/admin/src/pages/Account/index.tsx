import {
	Avatar,
	AvatarFallback,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Input,
	Label,
	Separator,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@magnet-cms/ui/components'
import { useState } from 'react'
import { toast } from 'sonner'
import { Head } from '~/components/Head'
import { useChangePassword, useUpdateProfile } from '~/hooks/useAccount'
import { useAuth } from '~/hooks/useAuth'

const AccountPage = () => {
	const { user } = useAuth()
	const updateProfile = useUpdateProfile()
	const changePassword = useChangePassword()

	const [profileData, setProfileData] = useState({
		name: user?.name || '',
		email: user?.email || '',
	})

	const [passwordData, setPasswordData] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	})

	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2)
	}

	const handleProfileSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		updateProfile.mutate(profileData, {
			onSuccess: () => {
				toast.success('Profile updated successfully')
			},
			onError: (error) => {
				toast.error(`Failed to update profile: ${error.message}`)
			},
		})
	}

	const handlePasswordSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		if (passwordData.newPassword !== passwordData.confirmPassword) {
			toast.error('New passwords do not match')
			return
		}

		if (passwordData.newPassword.length < 6) {
			toast.error('Password must be at least 6 characters')
			return
		}

		changePassword.mutate(
			{
				currentPassword: passwordData.currentPassword,
				newPassword: passwordData.newPassword,
			},
			{
				onSuccess: () => {
					toast.success('Password changed successfully')
					setPasswordData({
						currentPassword: '',
						newPassword: '',
						confirmPassword: '',
					})
				},
				onError: (error) => {
					toast.error(`Failed to change password: ${error.message}`)
				},
			},
		)
	}

	if (!user) {
		return null
	}

	return (
		<div className="flex flex-col w-full min-h-0">
			<Head title="Account" />

			<div className="flex-1 overflow-y-auto p-6">
				<div className="max-w-2xl mx-auto space-y-6">
					<div className="flex items-center gap-4">
						<Avatar className="h-20 w-20">
							<AvatarFallback className="text-2xl">
								{getInitials(user.name)}
							</AvatarFallback>
						</Avatar>
						<div>
							<h2 className="text-xl font-semibold">{user.name}</h2>
							<p className="text-muted-foreground">{user.email}</p>
							<p className="text-sm text-muted-foreground capitalize">
								{user.role}
							</p>
						</div>
					</div>

					<Separator />

					<Tabs defaultValue="profile" className="w-full">
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="profile">Profile</TabsTrigger>
							<TabsTrigger value="security">Security</TabsTrigger>
						</TabsList>

						<TabsContent value="profile" className="mt-6">
							<Card>
								<CardHeader>
									<CardTitle>Profile Information</CardTitle>
									<CardDescription>
										Update your account profile information.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<form onSubmit={handleProfileSubmit} className="space-y-4">
										<div className="space-y-2">
											<Label htmlFor="name">Name</Label>
											<Input
												id="name"
												value={profileData.name}
												onChange={(e) =>
													setProfileData((prev) => ({
														...prev,
														name: e.target.value,
													}))
												}
												placeholder="Your name"
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="email">Email</Label>
											<Input
												id="email"
												type="email"
												value={profileData.email}
												onChange={(e) =>
													setProfileData((prev) => ({
														...prev,
														email: e.target.value,
													}))
												}
												placeholder="your@email.com"
											/>
										</div>
										<Button type="submit" disabled={updateProfile.isPending}>
											{updateProfile.isPending ? 'Saving...' : 'Save Changes'}
										</Button>
									</form>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="security" className="mt-6">
							<Card>
								<CardHeader>
									<CardTitle>Change Password</CardTitle>
									<CardDescription>
										Update your password to keep your account secure.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<form onSubmit={handlePasswordSubmit} className="space-y-4">
										<div className="space-y-2">
											<Label htmlFor="currentPassword">Current Password</Label>
											<Input
												id="currentPassword"
												type="password"
												value={passwordData.currentPassword}
												onChange={(e) =>
													setPasswordData((prev) => ({
														...prev,
														currentPassword: e.target.value,
													}))
												}
												placeholder="Enter current password"
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="newPassword">New Password</Label>
											<Input
												id="newPassword"
												type="password"
												value={passwordData.newPassword}
												onChange={(e) =>
													setPasswordData((prev) => ({
														...prev,
														newPassword: e.target.value,
													}))
												}
												placeholder="Enter new password"
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="confirmPassword">
												Confirm New Password
											</Label>
											<Input
												id="confirmPassword"
												type="password"
												value={passwordData.confirmPassword}
												onChange={(e) =>
													setPasswordData((prev) => ({
														...prev,
														confirmPassword: e.target.value,
													}))
												}
												placeholder="Confirm new password"
											/>
										</div>
										<Button type="submit" disabled={changePassword.isPending}>
											{changePassword.isPending
												? 'Changing...'
												: 'Change Password'}
										</Button>
									</form>
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	)
}

export default AccountPage
