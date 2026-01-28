import { FormDrawer, RHFText } from '@magnet-cms/ui'
import { Key } from 'lucide-react'
import { z } from 'zod'

const createApiKeySchema = z.object({
  name: z.string().min(1, 'Key name is required'),
  expiresAt: z.string().optional(),
})

type CreateApiKeyFormValues = z.infer<typeof createApiKeySchema>

interface CreateApiKeyDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: { name: string; expiresAt: string | null }) => void
}

export function CreateApiKeyDrawer({ open, onOpenChange, onCreate }: CreateApiKeyDrawerProps) {
  const handleSubmit = (data: CreateApiKeyFormValues) => {
    onCreate({
      name: data.name.trim(),
      expiresAt: data.expiresAt?.trim() || null,
    })
  }

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Create New API Key"
      description="Create a new API key to authenticate requests to your application. Make sure to copy it immediately as it won't be shown again."
      submitLabel="Create API Key"
      submitIcon={Key}
      onSubmit={handleSubmit}
      schema={createApiKeySchema}
      defaultValues={{ name: '', expiresAt: '' }}
    >
      <RHFText name="name" label="Key Name" placeholder="e.g. Production API Key" />
      <RHFText
        name="expiresAt"
        label="Expiration Date (Optional)"
        type="date"
        description="Leave empty for keys that never expire"
      />
    </FormDrawer>
  )
}
