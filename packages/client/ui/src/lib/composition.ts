import * as React from 'react'

/**
 * Composes multiple event handlers into a single handler.
 * If the original handler calls event.preventDefault(), the composed handlers won't run.
 */
export function composeEventHandlers<E>(
	originalHandler?: (event: E) => void,
	...handlers: Array<((event: E) => void) | undefined>
) {
	return function handleEvent(event: E) {
		originalHandler?.(event)

		if (
			!(event as unknown as { defaultPrevented?: boolean }).defaultPrevented
		) {
			for (const handler of handlers) {
				handler?.(event)
			}
		}
	}
}

/**
 * Composes multiple refs into a single ref callback.
 */
export function useComposedRefs<T>(
	...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
	return React.useCallback(
		(node: T) => {
			for (const ref of refs) {
				if (typeof ref === 'function') {
					ref(node)
				} else if (ref != null) {
					;(ref as React.MutableRefObject<T>).current = node
				}
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		refs,
	)
}
