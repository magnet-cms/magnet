/**
 * Polar Plugin - Frontend Entry
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
}

interface PluginRegistration {
	manifest: FrontendPluginManifest
	components: Record<string, () => Promise<{ default: ComponentType<unknown> }>>
}

const manifest: FrontendPluginManifest = {
	pluginName: 'polar',
	routes: [
		{
			path: 'polar',
			componentId: 'PolarDashboard',
			children: [
				{ path: '', componentId: 'PolarDashboard' },
				{ path: 'customers', componentId: 'PolarCustomers' },
				{ path: 'products', componentId: 'PolarProducts' },
				{ path: 'subscriptions', componentId: 'PolarSubscriptions' },
				{ path: 'orders', componentId: 'PolarOrders' },
				{ path: 'benefits', componentId: 'PolarBenefits' },
			],
		},
	],
	sidebar: [
		{
			id: 'polar',
			title: 'Polar Payments',
			url: '/polar',
			icon: 'Zap',
			order: 31,
			items: [
				{
					id: 'polar-dashboard',
					title: 'Dashboard',
					url: '/polar',
					icon: 'BarChart3',
				},
				{
					id: 'polar-customers',
					title: 'Customers',
					url: '/polar/customers',
					icon: 'Users',
				},
				{
					id: 'polar-products',
					title: 'Products',
					url: '/polar/products',
					icon: 'Package',
				},
				{
					id: 'polar-subscriptions',
					title: 'Subscriptions',
					url: '/polar/subscriptions',
					icon: 'RefreshCw',
				},
				{
					id: 'polar-orders',
					title: 'Orders',
					url: '/polar/orders',
					icon: 'Receipt',
				},
				{
					id: 'polar-benefits',
					title: 'Benefits',
					url: '/polar/benefits',
					icon: 'Gift',
				},
			],
		},
	],
}

const components: Record<
	string,
	() => Promise<{ default: ComponentType<unknown> }>
> = {
	PolarDashboard: () => import('./pages/polar-dashboard'),
	PolarCustomers: () => import('./pages/customers'),
	PolarProducts: () => import('./pages/products'),
	PolarSubscriptions: () => import('./pages/subscriptions'),
	PolarOrders: () => import('./pages/orders'),
	PolarBenefits: () => import('./pages/benefits'),
}

function registerPlugin() {
	if (!window.__MAGNET_PLUGINS__) {
		window.__MAGNET_PLUGINS__ = []
	}

	const alreadyRegistered = window.__MAGNET_PLUGINS__.some(
		(p) => p.manifest.pluginName === manifest.pluginName,
	)

	if (!alreadyRegistered) {
		window.__MAGNET_PLUGINS__.push({ manifest, components })
		console.log(`[Magnet] Plugin registered: ${manifest.pluginName}`)
	}
}

registerPlugin()

export const polarPlugin = () => ({ manifest, components })
export default polarPlugin
