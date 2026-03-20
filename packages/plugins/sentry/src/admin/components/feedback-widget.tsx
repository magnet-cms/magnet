import { useAdapter } from '@magnet-cms/admin'
import { useEffect, useRef } from 'react'

interface SentryClientConfig {
	dsn: string
	enabled: boolean
	environment: string
}

/**
 * Mounts the Sentry User Feedback widget via the @sentry/browser feedbackIntegration.
 *
 * Fetches the public DSN from the backend (/sentry/config), initializes the
 * Sentry Browser SDK if not already initialized, and attaches a floating
 * feedback button to the page.
 *
 * The widget uses Sentry's shadow DOM isolation so it is style-independent
 * from the admin UI theme.
 */
export function SentryFeedbackWidget() {
	const adapter = useAdapter()
	const feedbackRef = useRef<{ remove: () => void } | null>(null)

	useEffect(() => {
		let cancelled = false

		async function init() {
			try {
				const config =
					await adapter.request<SentryClientConfig>('/sentry/config')

				if (cancelled || !config.enabled || !config.dsn) return

				// Dynamically import @sentry/browser to keep it out of the main bundle
				const Sentry = await import('@sentry/browser')

				if (cancelled) return

				// Initialize Sentry Browser SDK if not already done
				if (!Sentry.getClient()) {
					Sentry.init({
						dsn: config.dsn,
						environment: config.environment,
					})
				}

				// Attach the feedback widget — uses shadow DOM for style isolation
				const feedback = Sentry.feedbackIntegration({
					colorScheme: 'system',
					buttonLabel: 'Report an Issue',
					submitButtonLabel: 'Send Report',
					messagePlaceholder: 'Describe the issue you encountered...',
					showBranding: false,
				})

				const widget = feedback.createWidget?.()
				if (widget) {
					feedbackRef.current = widget
				}
			} catch {
				// Sentry is optional — never crash the admin UI
			}
		}

		init()

		return () => {
			cancelled = true
			feedbackRef.current?.remove()
			feedbackRef.current = null
		}
	}, [adapter])

	// Widget is rendered by Sentry SDK into the DOM directly — no React output needed
	return null
}
