/**
 * Sentry Plugin — Frontend Entry
 *
 * Self-registers the plugin when loaded via script injection.
 * The admin app loads plugin bundles at runtime and plugins self-register
 * on window.__MAGNET_PLUGINS__.
 */

import type { ComponentType } from 'react'

interface FrontendPluginManifest {
	pluginName: string
	routes?: {
		path: string
		componentId: string
		requiresAuth?: boolean
		children?: { path: string; componentId: string }[]
	}[]
	sidebar?: {
		id: string
		title: string
		url: string
		icon: string
		order?: number
		items?: { id: string; title: string; url: string; icon: string }[]
	}[]
	widgets?: {
		componentId: string
		position: 'global' | 'dashboard' | 'header'
	}[]
}

interface PluginRegistration {
	manifest: FrontendPluginManifest
	components: Record<string, () => Promise<{ default: ComponentType<unknown> }>>
}

const manifest: FrontendPluginManifest = {
	pluginName: 'sentry',
	routes: [
		{
			path: 'sentry',
			componentId: 'SentryDashboard',
			requiresAuth: true,
			children: [
				{ path: '', componentId: 'SentryDashboard' },
				{ path: 'issues', componentId: 'SentryIssues' },
				{ path: 'settings', componentId: 'SentrySettings' },
			],
		},
	],
	sidebar: [
		{
			id: 'sentry',
			title: 'Sentry',
			url: '/sentry',
			icon: 'AlertTriangle',
			order: 80,
			items: [
				{
					id: 'sentry-dashboard',
					title: 'Dashboard',
					url: '/sentry',
					icon: 'BarChart3',
				},
				{
					id: 'sentry-issues',
					title: 'Issues',
					url: '/sentry/issues',
					icon: 'Bug',
				},
				{
					id: 'sentry-settings',
					title: 'Settings',
					url: '/sentry/settings',
					icon: 'Settings',
				},
			],
		},
	],
	// Global widget — the feedback button is mounted once on the page
	widgets: [
		{
			componentId: 'SentryFeedbackWidget',
			position: 'global',
		},
	],
}

const components: Record<
	string,
	() => Promise<{ default: ComponentType<unknown> }>
> = {
	SentryDashboard: () => import('./pages/sentry-dashboard'),
	SentryIssues: () => import('./pages/sentry-issues'),
	SentrySettings: () => import('./pages/sentry-settings'),
	SentryFeedbackWidget: () =>
		import('./components/feedback-widget').then((m) => ({
			default: m.SentryFeedbackWidget as ComponentType<unknown>,
		})),
}

function registerPlugin() {
	if (!window.__MAGNET_PLUGINS__) {
		window.__MAGNET_PLUGINS__ = []
	}

	const alreadyRegistered = window.__MAGNET_PLUGINS__.some(
		(p: PluginRegistration) => p.manifest.pluginName === manifest.pluginName,
	)

	if (!alreadyRegistered) {
		window.__MAGNET_PLUGINS__.push({ manifest, components })
		console.log(`[Magnet] Plugin registered: ${manifest.pluginName}`)
	}
}

registerPlugin()

export const sentryPlugin = () => ({ manifest, components })
export default sentryPlugin
