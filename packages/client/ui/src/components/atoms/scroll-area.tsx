'use client'

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import * as React from 'react'

import { cn } from '../../lib/utils'

type ScrollAreaOrientation = 'vertical' | 'horizontal' | 'both'

type ScrollAreaProps = React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
	orientation?: ScrollAreaOrientation
}

function ScrollArea({
	className,
	children,
	orientation = 'vertical',
	...props
}: ScrollAreaProps) {
	const showVertical = orientation === 'vertical' || orientation === 'both'
	const showHorizontal = orientation === 'horizontal' || orientation === 'both'

	return (
		<ScrollAreaPrimitive.Root
			data-slot="scroll-area"
			className={cn('relative', className)}
			{...props}
		>
			<ScrollAreaPrimitive.Viewport
				data-slot="scroll-area-viewport"
				className={cn(
					'focus-visible:ring-ring/50 rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1',
					showHorizontal && !showVertical ? 'w-full' : 'size-full',
				)}
			>
				{children}
			</ScrollAreaPrimitive.Viewport>
			{showVertical && <ScrollBar orientation="vertical" />}
			{showHorizontal && <ScrollBar orientation="horizontal" />}
			{showVertical && showHorizontal && <ScrollAreaPrimitive.Corner />}
		</ScrollAreaPrimitive.Root>
	)
}

function ScrollBar({
	className,
	orientation = 'vertical',
	...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
	return (
		<ScrollAreaPrimitive.ScrollAreaScrollbar
			data-slot="scroll-area-scrollbar"
			orientation={orientation}
			className={cn(
				'flex touch-none p-px transition-colors select-none',
				orientation === 'vertical' &&
					'h-full w-2.5 border-l border-l-transparent',
				orientation === 'horizontal' &&
					'h-2.5 flex-col border-t border-t-transparent',
				className,
			)}
			{...props}
		>
			<ScrollAreaPrimitive.ScrollAreaThumb
				data-slot="scroll-area-thumb"
				className="bg-border relative flex-1 rounded-full"
			/>
		</ScrollAreaPrimitive.ScrollAreaScrollbar>
	)
}

export { ScrollArea, ScrollBar }
