'use client'

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	Button,
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	Input,
	Label,
	Skeleton,
	Switch,
} from '@magnet-cms/ui'
import { cn } from '@magnet-cms/ui/lib/utils'
import {
	Camera,
	Key,
	Laptop,
	Loader2,
	ShieldAlert,
	Smartphone,
	User,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useChangePassword, useUpdateProfile } from '~/hooks/useAccount'
import { useAuth } from '~/hooks/useAuth'
import { useAppIntl } from '~/i18n'

import { PageHeader } from '../../shared'

import { ActivityLogsPanel } from './ActivityLogsPanel'

interface ActiveSession {
	id: string
	device: string
	location: string
	isCurrent: boolean
	lastActive: string
	icon: typeof Laptop | typeof Smartphone
}

// Note: Sessions would need a dedicated API - using placeholder for now
const mockSessions: ActiveSession[] = [
	{
		id: '1',
		device: 'Current Browser',
		location: 'Unknown',
		isCurrent: true,
		lastActive: 'Current Session',
		icon: Laptop,
	},
]

type ProfileTab = 'personal' | 'security'

export function ProfilePage() {
	const intl = useAppIntl()
	const { user, isLoading: isUserLoading } = useAuth()
	const { mutate: updateProfile, isPending: isUpdatingProfile } =
		useUpdateProfile()
	const { mutate: changePassword, isPending: isChangingPassword } =
		useChangePassword()

	const [activeTab, setActiveTab] = useState<ProfileTab>('personal')
	const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
	const [profileForm, setProfileForm] = useState({
		name: '',
		email: '',
		avatarUrl: '',
	})
	const [passwordForm, setPasswordForm] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	})

	// Sync profile form with user data
	useEffect(() => {
		if (user) {
			setProfileForm({
				name: user.name || '',
				email: user.email || '',
				avatarUrl: '',
			})
		}
	}, [user])

	const handleProfileUpdate = useCallback(() => {
		updateProfile(
			{ name: profileForm.name },
			{
				onSuccess: () => {
					toast.success(
						intl.formatMessage({
							id: 'profile.updateSuccess',
							defaultMessage: 'Profile updated successfully',
						}),
					)
				},
				onError: (error) => {
					toast.error(
						error.message ||
							intl.formatMessage({
								id: 'profile.updateError',
								defaultMessage: 'Failed to update profile',
							}),
					)
				},
			},
		)
	}, [profileForm.name, updateProfile])

	const handleAvatarUpload = () => {
		// Avatar upload would need media integration
		toast.info(
			intl.formatMessage({
				id: 'profile.avatarComingSoon',
				defaultMessage: 'Avatar upload coming soon',
			}),
		)
	}

	const handlePasswordChange = useCallback(() => {
		// Validate passwords match
		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			toast.error(
				intl.formatMessage({
					id: 'profile.passwordMismatch',
					defaultMessage: 'New passwords do not match',
				}),
			)
			return
		}

		// Validate password length
		if (passwordForm.newPassword.length < 8) {
			toast.error(
				intl.formatMessage({
					id: 'profile.passwordTooShort',
					defaultMessage: 'Password must be at least 8 characters',
				}),
			)
			return
		}

		changePassword(
			{
				currentPassword: passwordForm.currentPassword,
				newPassword: passwordForm.newPassword,
			},
			{
				onSuccess: () => {
					toast.success(
						intl.formatMessage({
							id: 'profile.passwordChanged',
							defaultMessage: 'Password changed successfully',
						}),
					)
					setPasswordForm({
						currentPassword: '',
						newPassword: '',
						confirmPassword: '',
					})
				},
				onError: (error) => {
					toast.error(
						error.message ||
							intl.formatMessage({
								id: 'profile.passwordChangeError',
								defaultMessage: 'Failed to change password',
							}),
					)
				},
			},
		)
	}, [passwordForm, changePassword])

	const handleRevokeSession = (_sessionId: string) => {
		// Session management would need dedicated API
		toast.info(
			intl.formatMessage({
				id: 'profile.sessionManagementComingSoon',
				defaultMessage: 'Session management coming soon',
			}),
		)
	}

	// Loading state
	if (isUserLoading) {
		return (
			<div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
				<PageHeader>
					<div className="h-16 flex items-center justify-between px-6">
						<div>
							<Skeleton className="h-6 w-24 mb-1" />
							<Skeleton className="h-4 w-64" />
						</div>
					</div>
				</PageHeader>
				<div className="flex-1 p-6">
					<Skeleton className="h-64 w-full" />
				</div>
			</div>
		)
	}

	return (
		<div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
			<PageHeader>
				<div className="h-16 flex items-center justify-between px-6">
					<div>
						<h1 className="text-lg font-semibold text-foreground tracking-tight">
							{intl.formatMessage({
								id: 'profile.title',
								defaultMessage: 'Profile',
							})}
						</h1>
						<p className="text-xs text-muted-foreground">
							{intl.formatMessage({
								id: 'profile.subtitle',
								defaultMessage:
									'Manage your account settings and security preferences.',
							})}
						</p>
					</div>
				</div>
			</PageHeader>

			{/* Tabs */}
			<header className="shrink-0 border-b border-border bg-background/80 backdrop-blur-md z-20 sticky top-0">
				<div className="px-8 flex items-center gap-6 border-b border-border">
					<button
						type="button"
						onClick={() => setActiveTab('personal')}
						className={cn(
							'py-3 text-sm font-medium border-b-2 transition-colors',
							activeTab === 'personal'
								? 'text-foreground border-foreground'
								: 'text-muted-foreground hover:text-foreground border-transparent hover:border-border',
						)}
					>
						{intl.formatMessage({
							id: 'profile.personalTab',
							defaultMessage: 'Personal',
						})}
					</button>
					<button
						type="button"
						onClick={() => setActiveTab('security')}
						className={cn(
							'py-3 text-sm font-medium border-b-2 transition-colors',
							activeTab === 'security'
								? 'text-foreground border-foreground'
								: 'text-muted-foreground hover:text-foreground border-transparent hover:border-border',
						)}
					>
						{intl.formatMessage({
							id: 'profile.securityTab',
							defaultMessage: 'Security',
						})}
					</button>
				</div>
			</header>

			{/* Content Body */}
			<div className="flex-1 flex overflow-hidden bg-muted/50">
				<div className="flex-1 overflow-y-auto p-6">
					<div className="space-y-6 pb-10">
						{/* Personal Tab Content */}
						{activeTab === 'personal' && (
							<>
								{/* Personal Information Section */}
								<Card>
									<CardHeader>
										<div className="flex items-center gap-3 mb-1">
											<div className="p-2 bg-muted rounded-lg border border-border">
												<User className="w-5 h-5 text-foreground" />
											</div>
											<div>
												<h3 className="text-base font-semibold text-foreground">
													{intl.formatMessage({
														id: 'profile.personalInfo',
														defaultMessage: 'Personal Information',
													})}
												</h3>
												<p className="text-sm text-muted-foreground mt-1">
													{intl.formatMessage({
														id: 'profile.personalInfoDescription',
														defaultMessage:
															'Update your profile photo, name, and view your email address.',
													})}
												</p>
											</div>
										</div>
									</CardHeader>
									<CardContent className="space-y-6">
										{/* Profile Photo Upload */}
										<div className="flex items-center gap-6">
											<button
												type="button"
												onClick={handleAvatarUpload}
												className="relative group cursor-pointer rounded-full"
											>
												<Avatar className="w-20 h-20 border-2 border-border">
													{profileForm.avatarUrl ? (
														<AvatarImage
															src={profileForm.avatarUrl}
															alt={profileForm.name}
														/>
													) : (
														<AvatarFallback className="text-2xl bg-muted text-muted-foreground">
															{profileForm.name.charAt(0).toUpperCase() || 'U'}
														</AvatarFallback>
													)}
												</Avatar>
												<div className="absolute inset-0 rounded-full bg-foreground/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
													<Camera className="w-5 h-5 text-white" />
												</div>
											</button>
											<div>
												<h3 className="text-sm font-medium text-foreground">
													{intl.formatMessage({
														id: 'profile.profilePhoto',
														defaultMessage: 'Profile Photo',
													})}
												</h3>
												<p className="text-xs text-muted-foreground mt-1">
													{intl.formatMessage({
														id: 'profile.profilePhotoDescription',
														defaultMessage:
															'This photo will be displayed on your profile and in your account.',
													})}
												</p>
												<button
													type="button"
													onClick={handleAvatarUpload}
													className="mt-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
												>
													{intl.formatMessage({
														id: 'profile.uploadNewPhoto',
														defaultMessage: 'Upload New Photo',
													})}
												</button>
											</div>
										</div>

										{/* Name and Email Fields */}
										<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
											<div className="col-span-1 space-y-1.5">
												<Label
													htmlFor="profile-name"
													className="text-xs font-medium text-muted-foreground"
												>
													{intl.formatMessage({
														id: 'profile.fullName',
														defaultMessage: 'Full Name',
													})}
												</Label>
												<Input
													id="profile-name"
													type="text"
													value={profileForm.name}
													onChange={(e) =>
														setProfileForm({
															...profileForm,
															name: e.target.value,
														})
													}
													className="rounded-lg border-border bg-muted/50"
												/>
											</div>
											<div className="col-span-1 space-y-1.5">
												<Label
													htmlFor="profile-email"
													className="text-xs font-medium text-muted-foreground"
												>
													{intl.formatMessage({
														id: 'profile.emailAddress',
														defaultMessage: 'Email Address',
													})}
												</Label>
												<Input
													id="profile-email"
													type="email"
													value={profileForm.email}
													disabled
													className="rounded-lg border-border bg-muted/50 cursor-not-allowed"
												/>
												<p className="text-[11px] text-muted-foreground">
													{intl.formatMessage({
														id: 'profile.emailCannotChange',
														defaultMessage:
															'Your email address cannot be changed.',
													})}
												</p>
											</div>
										</div>
									</CardContent>
									<CardFooter className="bg-muted border-t border-border flex items-center justify-end gap-3">
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => {
												if (user) {
													setProfileForm({
														name: user.name || '',
														email: user.email || '',
														avatarUrl: '',
													})
												}
											}}
										>
											{intl.formatMessage({
												id: 'common.actions.cancel',
												defaultMessage: 'Cancel',
											})}
										</Button>
										<Button
											type="button"
											size="sm"
											onClick={handleProfileUpdate}
											disabled={isUpdatingProfile}
										>
											{isUpdatingProfile ? (
												<Loader2 className="w-3.5 h-3.5 animate-spin" />
											) : null}
											{intl.formatMessage({
												id: 'common.actions.saveChanges',
												defaultMessage: 'Save Changes',
											})}
										</Button>
									</CardFooter>
								</Card>
							</>
						)}

						{/* Security Tab Content */}
						{activeTab === 'security' && (
							<>
								{/* Password Section */}
								<Card>
									<CardHeader>
										<div className="flex items-center gap-3 mb-1">
											<div className="p-2 bg-muted rounded-lg border border-border">
												<Key className="w-5 h-5 text-foreground" />
											</div>
											<div>
												<h3 className="text-base font-semibold text-foreground">
													{intl.formatMessage({
														id: 'profile.password',
														defaultMessage: 'Password',
													})}
												</h3>
												<p className="text-sm text-muted-foreground mt-1">
													{intl.formatMessage({
														id: 'profile.passwordDescription',
														defaultMessage:
															'Update your password associated with your account.',
													})}
												</p>
											</div>
										</div>
									</CardHeader>
									<CardContent className="space-y-4">
										<div>
											<Label htmlFor="current-password">
												{intl.formatMessage({
													id: 'profile.currentPassword',
													defaultMessage: 'Current Password',
												})}
											</Label>
											<Input
												id="current-password"
												type="password"
												placeholder="••••••••••••"
												value={passwordForm.currentPassword}
												onChange={(e) =>
													setPasswordForm({
														...passwordForm,
														currentPassword: e.target.value,
													})
												}
												className="mt-1.5"
											/>
										</div>

										<div className="grid grid-cols-2 gap-4">
											<div>
												<Label htmlFor="new-password">
													{intl.formatMessage({
														id: 'profile.newPassword',
														defaultMessage: 'New Password',
													})}
												</Label>
												<Input
													id="new-password"
													type="password"
													placeholder="Min 8 chars"
													value={passwordForm.newPassword}
													onChange={(e) =>
														setPasswordForm({
															...passwordForm,
															newPassword: e.target.value,
														})
													}
													className="mt-1.5"
												/>
											</div>
											<div>
												<Label htmlFor="confirm-password">
													{intl.formatMessage({
														id: 'profile.confirmPassword',
														defaultMessage: 'Confirm Password',
													})}
												</Label>
												<Input
													id="confirm-password"
													type="password"
													placeholder="Min 8 chars"
													value={passwordForm.confirmPassword}
													onChange={(e) =>
														setPasswordForm({
															...passwordForm,
															confirmPassword: e.target.value,
														})
													}
													className="mt-1.5"
												/>
											</div>
										</div>

										<div className="pt-2">
											<h4 className="text-xs font-medium text-foreground mb-2">
												{intl.formatMessage({
													id: 'profile.passwordRequirements',
													defaultMessage: 'Password requirements:',
												})}
											</h4>
											<ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
												<li>
													{intl.formatMessage({
														id: 'profile.passwordMin8',
														defaultMessage: 'Minimum 8 characters long',
													})}
												</li>
												<li>
													{intl.formatMessage({
														id: 'profile.passwordSpecialChar',
														defaultMessage: 'At least one special character',
													})}
												</li>
												<li>
													{intl.formatMessage({
														id: 'profile.passwordNoCommon',
														defaultMessage: 'No common passwords',
													})}
												</li>
											</ul>
										</div>
									</CardContent>
									<CardFooter className="bg-muted border-t border-border flex items-center justify-end gap-3">
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() =>
												setPasswordForm({
													currentPassword: '',
													newPassword: '',
													confirmPassword: '',
												})
											}
										>
											{intl.formatMessage({
												id: 'common.actions.cancel',
												defaultMessage: 'Cancel',
											})}
										</Button>
										<Button
											type="button"
											size="sm"
											onClick={handlePasswordChange}
											disabled={isChangingPassword}
										>
											{isChangingPassword ? (
												<Loader2 className="w-3.5 h-3.5 animate-spin" />
											) : null}
											{intl.formatMessage({
												id: 'profile.updatePassword',
												defaultMessage: 'Update Password',
											})}
										</Button>
									</CardFooter>
								</Card>

								{/* 2FA Section */}
								<Card>
									<CardHeader>
										<div className="flex items-start justify-between">
											<div className="flex gap-4">
												<div className="p-2 bg-muted rounded-lg border border-border h-fit">
													<ShieldAlert className="w-5 h-5 text-foreground" />
												</div>
												<div>
													<h3 className="text-base font-semibold text-foreground">
														{intl.formatMessage({
															id: 'profile.twoFactor',
															defaultMessage: 'Two-factor Authentication',
														})}
													</h3>
													<p className="text-sm text-muted-foreground mt-1 max-w-md">
														{intl.formatMessage({
															id: 'profile.twoFactorDescription',
															defaultMessage:
																'Add an extra layer of security to your account by requiring a code from your authenticator app.',
														})}
													</p>
												</div>
											</div>
											<Switch
												checked={twoFactorEnabled}
												onCheckedChange={setTwoFactorEnabled}
											/>
										</div>
									</CardHeader>
								</Card>

								{/* Active Sessions */}
								<Card>
									<CardHeader>
										<div className="flex items-center gap-3 mb-1">
											<div className="p-2 bg-muted rounded-lg border border-border">
												<Laptop className="w-5 h-5 text-foreground" />
											</div>
											<div>
												<h3 className="text-base font-semibold text-foreground">
													{intl.formatMessage({
														id: 'profile.activeSessions',
														defaultMessage: 'Active Sessions',
													})}
												</h3>
												<p className="text-sm text-muted-foreground mt-1">
													{intl.formatMessage({
														id: 'profile.activeSessionsDescription',
														defaultMessage:
															"Manage devices where you're currently logged in.",
													})}
												</p>
											</div>
										</div>
									</CardHeader>
									<CardContent className="p-0">
										<div className="divide-y divide-border">
											{mockSessions.map((session) => {
												const IconComponent = session.icon
												return (
													<div
														key={session.id}
														className="p-4 pl-14 pr-6 flex items-center justify-between group hover:bg-muted transition-colors"
													>
														<div className="flex items-center gap-4">
															<IconComponent className="w-6 h-6 text-muted-foreground" />
															<div>
																<p className="text-sm font-medium text-foreground">
																	{session.device}
																</p>
																<p className="text-xs text-muted-foreground">
																	{session.location} •{' '}
																	{session.isCurrent ? (
																		<span className="text-green-600 font-medium">
																			{intl.formatMessage({
																				id: 'profile.currentSession',
																				defaultMessage: 'Current Session',
																			})}
																		</span>
																	) : (
																		<span>{session.lastActive}</span>
																	)}
																</p>
															</div>
														</div>
														{!session.isCurrent && (
															<button
																type="button"
																onClick={() => handleRevokeSession(session.id)}
																className="text-xs font-medium text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-700"
															>
																{intl.formatMessage({
																	id: 'profile.revoke',
																	defaultMessage: 'Revoke',
																})}
															</button>
														)}
													</div>
												)
											})}
										</div>
									</CardContent>
								</Card>
							</>
						)}
					</div>
				</div>
				{/* Fixed Right Sidebar - Activity Logs */}
				<ActivityLogsPanel />
			</div>
		</div>
	)
}
