import * as React from 'react'
import { createRoot } from 'react-dom/client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/atoms/dialog'

interface ModalOptions {
  title?: string
  description?: string
  content?: React.ReactNode
  footer?: React.ReactNode
  onClose?: () => void
  className?: string
  showCloseButton?: boolean
}

interface ModalInstance {
  close: () => void
  update: (options: Partial<ModalOptions>) => void
}

class ModalService {
  private modals: Map<string, { root: ReturnType<typeof createRoot>; container: HTMLElement }> =
    new Map()

  open(options: ModalOptions = {}): ModalInstance {
    const id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    let currentOptions = { ...options }

    const ModalComponent = () => {
      const [isOpen, setIsOpen] = React.useState(true)

      const handleClose = () => {
        setIsOpen(false)
        if (currentOptions.onClose) {
          currentOptions.onClose()
        }
        setTimeout(() => {
          root.unmount()
          document.body.removeChild(container)
          this.modals.delete(id)
        }, 200)
      }

      const updateOptions = (newOptions: Partial<ModalOptions>) => {
        currentOptions = { ...currentOptions, ...newOptions }
        root.render(<ModalComponent />)
      }

      React.useEffect(() => {
        // Store the update function
        const modalInstance = this.modals.get(id)
        if (modalInstance) {
          ;(modalInstance as unknown as { update: (opts: Partial<ModalOptions>) => void }).update =
            updateOptions
        }
      }, [])

      return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
          <DialogContent
            className={currentOptions.className}
            showCloseButton={currentOptions.showCloseButton}
          >
            {(currentOptions.title || currentOptions.description) && (
              <DialogHeader>
                {currentOptions.title && <DialogTitle>{currentOptions.title}</DialogTitle>}
                {currentOptions.description && (
                  <DialogDescription>{currentOptions.description}</DialogDescription>
                )}
              </DialogHeader>
            )}
            {currentOptions.content}
            {currentOptions.footer && <DialogFooter>{currentOptions.footer}</DialogFooter>}
          </DialogContent>
        </Dialog>
      )
    }

    root.render(<ModalComponent />)

    const instance: ModalInstance = {
      close: () => {
        const modal = this.modals.get(id)
        if (modal) {
          const component = modal.root as unknown as {
            render: (element: React.ReactElement) => void
          }
          component.render(<></>)
          setTimeout(() => {
            modal.root.unmount()
            document.body.removeChild(container)
            this.modals.delete(id)
          }, 200)
        }
      },
      update: (newOptions: Partial<ModalOptions>) => {
        const modal = this.modals.get(id)
        if (modal) {
          const component = modal.root as unknown as {
            render: (element: React.ReactElement) => void
          }
          currentOptions = { ...currentOptions, ...newOptions }
          component.render(<ModalComponent />)
        }
      },
    }

    this.modals.set(id, { root, container } as unknown as {
      root: ReturnType<typeof createRoot>
      container: HTMLElement
    })

    return instance
  }

  closeAll(): void {
    this.modals.forEach((modal) => {
      modal.root.unmount()
      document.body.removeChild(modal.container)
    })
    this.modals.clear()
  }
}

export const modalService = new ModalService()
