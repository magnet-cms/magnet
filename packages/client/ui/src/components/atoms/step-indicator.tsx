'use client'

import { cn } from '../../lib/utils'

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  stepLabel?: string
  ofLabel?: string
  className?: string
}

export function StepIndicator({
  currentStep,
  totalSteps,
  stepLabel = 'Step',
  ofLabel = 'of',
  className,
}: StepIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="text-xs font-medium text-foreground">
        {stepLabel} {currentStep}
      </span>
      <span className="text-xs text-muted-foreground">
        {ofLabel} {totalSteps}
      </span>
      <div className="ml-2 flex items-center gap-1">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={`h-1 rounded-full ${
              index === 0 ? 'w-2' : 'w-8'
            } ${index < currentStep ? 'bg-foreground' : 'bg-muted-foreground'}`}
          />
        ))}
      </div>
    </div>
  )
}
