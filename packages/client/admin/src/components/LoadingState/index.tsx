import { Spinner } from '@magnet-cms/ui/components'

interface LoadingStateProps {
  message?: string
}

export const LoadingState = ({ message }: LoadingStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <Spinner />
      {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}
