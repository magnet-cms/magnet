import { Button } from '@magnet-cms/ui/components'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

/**
 * Route-level error boundary for React Router data routers.
 *
 * Catches unhandled errors thrown during route rendering and shows a friendly
 * error page instead of a blank white screen.
 *
 * Wire it into routes via `errorElement: <ErrorBoundaryPage />`.
 */
export function ErrorBoundaryPage() {
  const error = useRouteError()

  let title = 'Something went wrong'
  let message = 'An unexpected error occurred. Please try again.'

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = 'Page not found'
      message = "The page you're looking for doesn't exist."
    } else {
      title = `Error ${error.status}`
      message = error.statusText || message
    }
  } else if (error instanceof Error) {
    message = error.message
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-background">
      <div className="max-w-md w-full space-y-4 text-center">
        <div className="flex justify-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">{message}</p>
        <div className="flex gap-3 justify-center pt-2">
          <Button variant="outline" onClick={() => window.history.back()}>
            Go back
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload
          </Button>
          <Button
            onClick={() => {
              window.location.href = '/'
            }}
          >
            <Home className="mr-2 h-4 w-4" />
            Home
          </Button>
        </div>
      </div>
    </div>
  )
}
