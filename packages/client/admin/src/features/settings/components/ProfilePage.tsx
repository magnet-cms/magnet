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
import { Key, Loader2, ShieldAlert, Smartphone, Laptop, User, Camera } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useUpdateProfile, useChangePassword } from '~/hooks/useAccount'
import { useAuth } from '~/hooks/useAuth'

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
  const { user, isLoading: isUserLoading } = useAuth()
  const { mutate: updateProfile, isPending: isUpdatingProfile } = useUpdateProfile()
  const { mutate: changePassword, isPending: isChangingPassword } = useChangePassword()

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
          toast.success('Profile updated successfully')
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to update profile')
        },
      }
    )
  }, [profileForm.name, updateProfile])

  const handleAvatarUpload = () => {
    // Avatar upload would need media integration
    toast.info('Avatar upload coming soon')
  }

  const handlePasswordChange = useCallback(() => {
    // Validate passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    // Validate password length
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    changePassword(
      {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      },
      {
        onSuccess: () => {
          toast.success('Password changed successfully')
          setPasswordForm({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          })
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to change password')
        },
      }
    )
  }, [passwordForm, changePassword])

  const handleRevokeSession = (sessionId: string) => {
    // Session management would need dedicated API
    toast.info('Session management coming soon')
    console.log('Revoking session:', sessionId)
  }

  // Loading state
  if (isUserLoading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
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
    <div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
      <PageHeader>
        <div className="h-16 flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Profile</h1>
            <p className="text-xs text-gray-500">
              Manage your account settings and security preferences.
            </p>
          </div>
        </div>
      </PageHeader>

      {/* Tabs */}
      <header className="shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-md z-20 sticky top-0">
        <div className="px-8 flex items-center gap-6 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={cn(
              'py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'personal'
                ? 'text-gray-900 border-gray-900'
                : 'text-gray-500 hover:text-gray-900 border-transparent hover:border-gray-200'
            )}
          >
            Personal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={cn(
              'py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'security'
                ? 'text-gray-900 border-gray-900'
                : 'text-gray-500 hover:text-gray-900 border-transparent hover:border-gray-200'
            )}
          >
            Security
          </button>
        </div>
      </header>

      {/* Content Body */}
      <div className="flex-1 flex overflow-hidden bg-gray-50/50">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6 pb-10">
            {/* Personal Tab Content */}
            {activeTab === 'personal' && (
              <>
                {/* Personal Information Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                        <User className="w-5 h-5 text-gray-900" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">
                          Personal Information
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Update your profile photo, name, and view your email address.
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
                        <Avatar className="w-20 h-20 border-2 border-gray-200">
                          {profileForm.avatarUrl ? (
                            <AvatarImage src={profileForm.avatarUrl} alt={profileForm.name} />
                          ) : (
                            <AvatarFallback className="text-2xl bg-gray-50 text-gray-600">
                              {profileForm.name.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="absolute inset-0 rounded-full bg-gray-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="w-5 h-5 text-white" />
                        </div>
                      </button>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Profile Photo</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          This photo will be displayed on your profile and in your account.
                        </p>
                        <button
                          type="button"
                          onClick={handleAvatarUpload}
                          className="mt-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          Upload New Photo
                        </button>
                      </div>
                    </div>

                    {/* Name and Email Fields */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div className="col-span-1 space-y-1.5">
                        <Label htmlFor="profile-name" className="text-xs font-medium text-gray-700">
                          Full Name
                        </Label>
                        <Input
                          id="profile-name"
                          type="text"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                          className="rounded-lg border-gray-200 bg-gray-50/50"
                        />
                      </div>
                      <div className="col-span-1 space-y-1.5">
                        <Label
                          htmlFor="profile-email"
                          className="text-xs font-medium text-gray-700"
                        >
                          Email Address
                        </Label>
                        <Input
                          id="profile-email"
                          type="email"
                          value={profileForm.email}
                          disabled
                          className="rounded-lg border-gray-200 bg-gray-50/50 cursor-not-allowed"
                        />
                        <p className="text-[11px] text-gray-500">
                          Your email address cannot be changed.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
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
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleProfileUpdate}
                      disabled={isUpdatingProfile}
                    >
                      {isUpdatingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Save Changes
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
                      <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                        <Key className="w-5 h-5 text-gray-900" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">Password</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Update your password associated with your account.
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        placeholder="••••••••••••"
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                        }
                        className="mt-1.5"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="Min 8 chars"
                          value={passwordForm.newPassword}
                          onChange={(e) =>
                            setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                          }
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Min 8 chars"
                          value={passwordForm.confirmPassword}
                          onChange={(e) =>
                            setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                          }
                          className="mt-1.5"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <h4 className="text-xs font-medium text-gray-900 mb-2">
                        Password requirements:
                      </h4>
                      <ul className="text-xs text-gray-500 space-y-1 list-disc pl-4">
                        <li>Minimum 8 characters long</li>
                        <li>At least one special character</li>
                        <li>No common passwords</li>
                      </ul>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
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
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handlePasswordChange}
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Update Password
                    </Button>
                  </CardFooter>
                </Card>

                {/* 2FA Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 h-fit">
                          <ShieldAlert className="w-5 h-5 text-gray-900" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">
                            Two-factor Authentication
                          </h3>
                          <p className="text-sm text-gray-500 mt-1 max-w-md">
                            Add an extra layer of security to your account by requiring a code from
                            your authenticator app.
                          </p>
                        </div>
                      </div>
                      <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
                    </div>
                  </CardHeader>
                </Card>

                {/* Active Sessions */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                        <Laptop className="w-5 h-5 text-gray-900" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">Active Sessions</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Manage devices where you&apos;re currently logged in.
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-gray-100">
                      {mockSessions.map((session) => {
                        const IconComponent = session.icon
                        return (
                          <div
                            key={session.id}
                            className="p-4 pl-14 pr-6 flex items-center justify-between group hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <IconComponent className="w-6 h-6 text-gray-400" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {session.device}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {session.location} •{' '}
                                  {session.isCurrent ? (
                                    <span className="text-green-600 font-medium">
                                      Current Session
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
                                Revoke
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
