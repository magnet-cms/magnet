import * as React from 'react'
import { createRoot } from 'react-dom/client'

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../components/atoms/drawer'

interface DrawerOptions {
  title?: string
  description?: string
  content?: React.ReactNode
  footer?: React.ReactNode
  onClose?: () => void
  className?: string
  direction?: 'top' | 'bottom' | 'left' | 'right'
  side?: 'top' | 'bottom' | 'left' | 'right' // Alias for direction
}

interface DrawerInstance {
  close: () => void
  update: (options: Partial<DrawerOptions>) => void
}

class DrawerService {
  private drawers: Map<string, { root: ReturnType<typeof createRoot>; container: HTMLElement }> =
    new Map()

  open(options: DrawerOptions = {}): DrawerInstance {
    const id = `drawer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    let currentOptions = { ...options }
    const direction = options.direction || options.side || 'right'

    const DrawerComponent = () => {
      const [isOpen, setIsOpen] = React.useState(true)

      const handleClose = () => {
        setIsOpen(false)
        if (currentOptions.onClose) {
          currentOptions.onClose()
        }
        setTimeout(() => {
          root.unmount()
          document.body.removeChild(container)
          this.drawers.delete(id)
        }, 300) // Match animation duration
      }

      const updateOptions = (newOptions: Partial<DrawerOptions>) => {
        currentOptions = { ...currentOptions, ...newOptions }
        root.render(<DrawerComponent />)
      }

      React.useEffect(() => {
        // Store the update function
        const drawerInstance = this.drawers.get(id)
        if (drawerInstance) {
          ;(
            drawerInstance as unknown as { update: (opts: Partial<DrawerOptions>) => void }
          ).update = updateOptions
        }
      }, [])

      return (
        <Drawer open={isOpen} onOpenChange={(open) => !open && handleClose()} direction={direction}>
          <DrawerContent className={currentOptions.className}>
            {(currentOptions.title || currentOptions.description) && (
              <DrawerHeader>
                {currentOptions.title && <DrawerTitle>{currentOptions.title}</DrawerTitle>}
                {currentOptions.description && (
                  <DrawerDescription>{currentOptions.description}</DrawerDescription>
                )}
              </DrawerHeader>
            )}
            {currentOptions.content}
            {currentOptions.footer && <DrawerFooter>{currentOptions.footer}</DrawerFooter>}
          </DrawerContent>
        </Drawer>
      )
    }

    root.render(<DrawerComponent />)

    const instance: DrawerInstance = {
      close: () => {
        const drawer = this.drawers.get(id)
        if (drawer) {
          const component = drawer.root as unknown as {
            render: (element: React.ReactElement) => void
          }
          component.render(<></>)
          setTimeout(() => {
            drawer.root.unmount()
            document.body.removeChild(container)
            this.drawers.delete(id)
          }, 300)
        }
      },
      update: (newOptions: Partial<DrawerOptions>) => {
        const drawer = this.drawers.get(id)
        if (drawer) {
          const component = drawer.root as unknown as {
            render: (element: React.ReactElement) => void
          }
          currentOptions = { ...currentOptions, ...newOptions }
          component.render(<DrawerComponent />)
        }
      },
    }

    this.drawers.set(id, { root, container } as unknown as {
      root: ReturnType<typeof createRoot>
      container: HTMLElement
    })

    return instance
  }

  closeAll(): void {
    this.drawers.forEach((drawer) => {
      drawer.root.unmount()
      document.body.removeChild(drawer.container)
    })
    this.drawers.clear()
  }
}

export const drawerService = new DrawerService()
