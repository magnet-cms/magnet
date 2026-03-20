'use client'

import { useTheme } from 'next-themes'
import { type ReactNode, useLayoutEffect } from 'react'

/** Must match next-themes class list when attribute="class" and enableSystem */
const HTML_THEME_CLASSES = ['light', 'dark', 'system'] as const

/**
 * next-themes applies the theme class on document.documentElement in useEffect (after paint).
 * Our Tailwind tokens live on `.dark` / light class on ancestors; if an inner wrapper toggles
 * `dark` in render while <html> still has the old class, the subtree inherits the wrong
 * variables. Sync <html> in useLayoutEffect so it matches resolvedTheme before the browser paints.
 */
export function ThemeRootSync({ children }: { children: ReactNode }) {
	const { resolvedTheme } = useTheme()

	useLayoutEffect(() => {
		if (resolvedTheme !== 'light' && resolvedTheme !== 'dark') {
			return
		}
		const el = document.documentElement
		for (const t of HTML_THEME_CLASSES) {
			el.classList.remove(t)
		}
		el.classList.add(resolvedTheme)
		el.style.colorScheme = resolvedTheme
	}, [resolvedTheme])

	return (
		<div data-magnet-theme-root style={{ minHeight: '100vh' }}>
			{children}
		</div>
	)
}
