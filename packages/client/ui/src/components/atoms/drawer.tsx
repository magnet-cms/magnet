import * as React from 'react'
import { Drawer as DrawerPrimitive } from 'vaul'

import { cn } from '../../lib/utils'

function Drawer({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />
}

function DrawerTrigger({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className
      )}
      {...props}
    />
  )
}

function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          'group/drawer-content bg-background fixed z-50 flex h-auto flex-col',
          // Slide animations with floating effect
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'shadow-2xl border',
          // Top direction: padding from top, rounded bottom, slide from top
          'data-[vaul-drawer-direction=top]:inset-x-4 data-[vaul-drawer-direction=top]:top-4 data-[vaul-drawer-direction=top]:mb-4 data-[vaul-drawer-direction=top]:max-h-[calc(100vh-2rem)] data-[vaul-drawer-direction=top]:rounded-b-xl data-[vaul-drawer-direction=top]:rounded-t-none',
          'data-[vaul-drawer-direction=top]:data-[state=open]:slide-in-from-top data-[vaul-drawer-direction=top]:data-[state=closed]:slide-out-to-top',
          // Bottom direction: padding from bottom, rounded top, slide from bottom
          'data-[vaul-drawer-direction=bottom]:inset-x-4 data-[vaul-drawer-direction=bottom]:bottom-4 data-[vaul-drawer-direction=bottom]:mt-4 data-[vaul-drawer-direction=bottom]:max-h-[calc(100vh-2rem)] data-[vaul-drawer-direction=bottom]:rounded-t-xl data-[vaul-drawer-direction=bottom]:rounded-b-none',
          'data-[vaul-drawer-direction=bottom]:data-[state=open]:slide-in-from-bottom data-[vaul-drawer-direction=bottom]:data-[state=closed]:slide-out-to-bottom',
          // Right direction: padding from right, rounded left, slide from right
          'data-[vaul-drawer-direction=right]:inset-y-4 data-[vaul-drawer-direction=right]:right-4 data-[vaul-drawer-direction=right]:ml-4 data-[vaul-drawer-direction=right]:w-[calc(100%-2rem)] data-[vaul-drawer-direction=right]:max-w-sm data-[vaul-drawer-direction=right]:rounded-l-xl data-[vaul-drawer-direction=right]:rounded-r-none',
          'data-[vaul-drawer-direction=right]:data-[state=open]:slide-in-from-right data-[vaul-drawer-direction=right]:data-[state=closed]:slide-out-to-right',
          // Left direction: padding from left, rounded right, slide from left
          'data-[vaul-drawer-direction=left]:inset-y-4 data-[vaul-drawer-direction=left]:left-4 data-[vaul-drawer-direction=left]:mr-4 data-[vaul-drawer-direction=left]:w-[calc(100%-2rem)] data-[vaul-drawer-direction=left]:max-w-sm data-[vaul-drawer-direction=left]:rounded-r-xl data-[vaul-drawer-direction=left]:rounded-l-none',
          'data-[vaul-drawer-direction=left]:data-[state=open]:slide-in-from-left data-[vaul-drawer-direction=left]:data-[state=closed]:slide-out-to-left',
          // Animation duration
          'duration-300 ease-in-out',
          className
        )}
        {...props}
      >
        <div className="bg-muted mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        'flex flex-col gap-0.5 p-6 pb-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-1.5 md:text-left',
        className
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn('mt-auto flex flex-col gap-2 p-6 pt-4', className)}
      {...props}
    />
  )
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn('text-foreground font-semibold', className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
