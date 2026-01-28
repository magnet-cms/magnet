import { FormDrawer, RHFText } from '@magnet-cms/ui'
import { FolderPlus } from 'lucide-react'
import { z } from 'zod'

const newFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required'),
})

type NewFolderFormValues = z.infer<typeof newFolderSchema>

interface NewFolderDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string) => void
}

export function NewFolderDrawer({ open, onOpenChange, onCreate }: NewFolderDrawerProps) {
  const handleSubmit = (data: NewFolderFormValues) => {
    onCreate(data.name.trim())
  }

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="New Folder"
      description="Create a new folder to organize your assets."
      submitLabel="Create Folder"
      submitIcon={FolderPlus}
      onSubmit={handleSubmit}
      schema={newFolderSchema}
      defaultValues={{ name: '' }}
    >
      <RHFText name="name" label="Folder Name" placeholder="e.g. Product Images" />
    </FormDrawer>
  )
}
