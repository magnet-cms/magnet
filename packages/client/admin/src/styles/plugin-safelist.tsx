/**
 * Plugin Safelist - DO NOT IMPORT THIS FILE
 *
 * This file exists solely to ensure Tailwind generates utility classes
 * that plugins might use at runtime. Tailwind scans this file for class names.
 *
 * Plugins loaded dynamically don't get their classes scanned, so we
 * explicitly list common utilities here.
 */

// Grid columns
const _cols = `
  grid-cols-1 grid-cols-2 grid-cols-3 grid-cols-4 grid-cols-5 grid-cols-6
  grid-cols-7 grid-cols-8 grid-cols-9 grid-cols-10 grid-cols-11 grid-cols-12
`

// Column spans
const _spans = `
  col-span-1 col-span-2 col-span-3 col-span-4 col-span-5 col-span-6
  col-span-7 col-span-8 col-span-9 col-span-10 col-span-11 col-span-12
  col-span-full col-start-1 col-start-2 col-start-3 col-start-4
  col-end-1 col-end-2 col-end-3 col-end-4 col-end-13
`

// Row utilities
const _rows = `
  grid-rows-1 grid-rows-2 grid-rows-3 grid-rows-4 grid-rows-5 grid-rows-6
  row-span-1 row-span-2 row-span-3 row-span-4 row-span-5 row-span-6 row-span-full
`

// Gap utilities
const _gap = `
  gap-0 gap-1 gap-2 gap-3 gap-4 gap-5 gap-6 gap-7 gap-8 gap-10 gap-12 gap-16
  gap-x-0 gap-x-1 gap-x-2 gap-x-3 gap-x-4 gap-x-5 gap-x-6 gap-x-8
  gap-y-0 gap-y-1 gap-y-2 gap-y-3 gap-y-4 gap-y-5 gap-y-6 gap-y-8
`

// Height/Width utilities
const _sizing = `
  h-full h-screen h-auto h-fit h-min h-max
  w-full w-screen w-auto w-fit w-min w-max
  min-h-0 min-h-full min-h-screen min-h-fit
  max-h-full max-h-screen max-h-fit max-h-96
  min-w-0 min-w-full min-w-min min-w-max min-w-fit
  max-w-full max-w-screen-sm max-w-screen-md max-w-screen-lg max-w-screen-xl
  max-w-xs max-w-sm max-w-md max-w-lg max-w-xl max-w-2xl max-w-3xl max-w-4xl
`

// Overflow utilities
const _overflow = `
  overflow-auto overflow-hidden overflow-visible overflow-scroll
  overflow-x-auto overflow-x-hidden overflow-x-visible overflow-x-scroll
  overflow-y-auto overflow-y-hidden overflow-y-visible overflow-y-scroll
`

// Flex utilities
const _flex = `
  flex-1 flex-auto flex-initial flex-none
  flex-row flex-col flex-row-reverse flex-col-reverse
  flex-wrap flex-nowrap flex-wrap-reverse
  grow grow-0 shrink shrink-0
  basis-0 basis-1 basis-auto basis-full basis-1/2 basis-1/3 basis-1/4
`

// Justify and align
const _alignment = `
  justify-start justify-end justify-center justify-between justify-around justify-evenly
  items-start items-end items-center items-baseline items-stretch
  content-start content-end content-center content-between content-around
  self-auto self-start self-end self-center self-stretch
  place-content-start place-content-end place-content-center
  place-items-start place-items-end place-items-center place-items-stretch
`

// Spacing utilities (common padding/margin)
const _spacing = `
  p-0 p-1 p-2 p-3 p-4 p-5 p-6 p-7 p-8 p-10 p-12 p-16
  px-0 px-1 px-2 px-3 px-4 px-5 px-6 px-8 px-10 px-12
  py-0 py-1 py-2 py-3 py-4 py-5 py-6 py-8 py-10 py-12
  m-0 m-1 m-2 m-3 m-4 m-5 m-6 m-8 m-10 m-12 m-auto
  mx-0 mx-1 mx-2 mx-3 mx-4 mx-6 mx-8 mx-auto
  my-0 my-1 my-2 my-3 my-4 my-6 my-8 my-auto
  space-x-0 space-x-1 space-x-2 space-x-3 space-x-4 space-x-6 space-x-8
  space-y-0 space-y-1 space-y-2 space-y-3 space-y-4 space-y-6 space-y-8
`

// Position utilities
const _position = `
  static fixed absolute relative sticky
  inset-0 inset-auto inset-x-0 inset-y-0
  top-0 right-0 bottom-0 left-0
  top-auto right-auto bottom-auto left-auto
  top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
`

// Border radius
const _radius = `
  rounded-none rounded-sm rounded rounded-md rounded-lg rounded-xl rounded-2xl rounded-3xl rounded-full
`

// Aspect ratio
const _aspect = `
  aspect-auto aspect-square aspect-video
`

// Semantic theme tokens (plugins may compose these at runtime)
const _themeTokens = `
  bg-background bg-card bg-muted bg-popover bg-primary bg-secondary bg-accent
  text-foreground text-muted-foreground text-primary-foreground text-card-foreground
  border-border border-input
  ring-ring ring-offset-background
  hover:bg-muted hover:text-foreground
`

// Color utilities (backgrounds, text, borders)
const _colors = `
  bg-blue-50 bg-blue-100 bg-blue-500 bg-blue-600 bg-blue-700
  text-blue-500 text-blue-600 text-blue-700 text-blue-900
  border-blue-100 border-blue-200 border-blue-500

  bg-amber-50 bg-amber-100 bg-amber-500 bg-amber-600 bg-amber-700
  text-amber-500 text-amber-600 text-amber-700 text-amber-900
  border-amber-100 border-amber-200 border-amber-500

  bg-green-50 bg-green-100 bg-green-500 bg-green-600 bg-green-700
  text-green-500 text-green-600 text-green-700 text-green-900
  border-green-100 border-green-200 border-green-500

  bg-purple-50 bg-purple-100 bg-purple-500 bg-purple-600 bg-purple-700
  text-purple-500 text-purple-600 text-purple-700 text-purple-900
  border-purple-100 border-purple-200 border-purple-500

  bg-cyan-50 bg-cyan-100 bg-cyan-500 bg-cyan-600 bg-cyan-700
  text-cyan-500 text-cyan-600 text-cyan-700 text-cyan-900
  border-cyan-100 border-cyan-200 border-cyan-500

  bg-indigo-50 bg-indigo-100 bg-indigo-500 bg-indigo-600 bg-indigo-700
  text-indigo-500 text-indigo-600 text-indigo-700 text-indigo-900
  border-indigo-100 border-indigo-200 border-indigo-500

  bg-red-50 bg-red-100 bg-red-500 bg-red-600 bg-red-700
  text-red-500 text-red-600 text-red-700 text-red-900
  border-red-100 border-red-200 border-red-500

  bg-yellow-50 bg-yellow-100 bg-yellow-500 bg-yellow-600 bg-yellow-700
  text-yellow-500 text-yellow-600 text-yellow-700 text-yellow-900
  border-yellow-100 border-yellow-200 border-yellow-500

  bg-gray-50 bg-gray-100 bg-gray-500 bg-gray-600 bg-gray-700
  text-gray-500 text-gray-600 text-gray-700 text-gray-900
  border-gray-100 border-gray-200 border-gray-500
`

// Export to prevent tree-shaking (never actually used)
export const _safelist = {
	_cols,
	_spans,
	_rows,
	_gap,
	_sizing,
	_overflow,
	_flex,
	_alignment,
	_spacing,
	_position,
	_radius,
	_aspect,
	_themeTokens,
	_colors,
}
