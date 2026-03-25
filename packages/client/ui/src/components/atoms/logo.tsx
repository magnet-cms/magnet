import * as React from 'react'

import { cn } from '../../lib/utils'

interface LogoProps extends React.ComponentProps<'span'> {
  size?: 'sm' | 'default' | 'lg'
}

const sizeClasses = {
  sm: 'text-lg',
  default: 'text-2xl',
  lg: 'text-4xl',
}

function Logo({ className, size = 'default', ...props }: LogoProps) {
  return (
    <span
      data-slot="logo"
      className={cn('font-semibold italic tracking-tight', sizeClasses[size], className)}
      style={{ letterSpacing: '-0.02em' }}
      {...props}
    >
      magnet
    </span>
  )
}

export { Logo }
