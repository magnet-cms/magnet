import { FormDrawer, RHFSelect, RHFText } from '@magnet-cms/ui'
import { UserPlus } from 'lucide-react'
import { z } from 'zod'

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
  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Create New User"
      description="Add a new user to the system and assign their role."
      submitLabel="Create User"
      submitIcon={UserPlus}
      onSubmit={onCreate}
      schema={createUserSchema}
      defaultValues={{ name: '', email: '', role: '', password: '' }}
    >
      <RHFText name="name" label="Full Name" placeholder="John Doe" />
      <RHFText name="email" label="Email" type="email" placeholder="john.doe@example.com" />
      <RHFSelect name="role" label="Role" options={roleOptions} placeholder="Select a role" />
      <RHFText name="password" label="Password" type="password" placeholder="Enter password" />
    </FormDrawer>
  )
}
