import { FormDrawer, RHFSelect, RHFText } from '@magnet-cms/ui'
import { UserPlus } from 'lucide-react'
import { z } from 'zod'

import { useAppIntl } from '~/i18n'

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  role: z.string().min(1, 'Role is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type CreateUserFormValues = z.infer<typeof createUserSchema>

interface CreateUserDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: CreateUserFormValues) => void
  roleOptions: { label: string; value: string }[]
}

export function CreateUserDrawer({
  open,
  onOpenChange,
  onCreate,
  roleOptions,
}: CreateUserDrawerProps) {
  const intl = useAppIntl()
  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={intl.formatMessage({
        id: 'users.createDrawer.title',
        defaultMessage: 'Create New User',
      })}
      description={intl.formatMessage({
        id: 'users.createDrawer.description',
        defaultMessage: 'Add a new user to the system and assign their role.',
      })}
      submitLabel={intl.formatMessage({
        id: 'users.createDrawer.submitLabel',
        defaultMessage: 'Create User',
      })}
      submitIcon={UserPlus}
      onSubmit={onCreate}
      schema={createUserSchema}
      defaultValues={{ name: '', email: '', role: '', password: '' }}
    >
      <RHFText
        name="name"
        label={intl.formatMessage({
          id: 'users.createDrawer.fullName',
          defaultMessage: 'Full Name',
        })}
        placeholder="John Doe"
      />
      <RHFText
        name="email"
        label={intl.formatMessage({
          id: 'users.createDrawer.email',
          defaultMessage: 'Email',
        })}
        type="email"
        placeholder="john.doe@example.com"
      />
      <RHFSelect
        name="role"
        label={intl.formatMessage({
          id: 'users.createDrawer.role',
          defaultMessage: 'Role',
        })}
        options={roleOptions}
        placeholder={intl.formatMessage({
          id: 'users.createDrawer.rolePlaceholder',
          defaultMessage: 'Select a role',
        })}
      />
      <RHFText
        name="password"
        label={intl.formatMessage({
          id: 'users.createDrawer.password',
          defaultMessage: 'Password',
        })}
        type="password"
      />
    </FormDrawer>
  )
}
