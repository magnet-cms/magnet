import type {
	EnvVarRequirement,
	PluginMagnetProvider,
} from '@magnet-cms/common'
import { Plugin } from '@magnet-cms/core'
import { PolarModule } from './polar.module'
import type { PolarPluginConfig } from './types'

/**
 * Polar Plugin
 *
 * Provides Polar.sh payment integration for Magnet CMS:
 * - Product, subscription, and customer management
 * - Webhook processing with idempotency
 * - Checkout and Customer Portal sessions
 * - Admin dashboard with revenue metrics
 * - User subscription access and feature flags
 * - Benefit management (license keys, downloads, etc.)
 */
@Plugin({
	name: 'polar',
	description: 'Polar.sh payments plugin for Magnet CMS',
	version: '0.1.0',
	module: PolarModule,
	frontend: {
		routes: [
			{
				path: 'polar',
				componentId: 'PolarDashboard',
				requiresAuth: true,
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
	},
})
export class PolarPlugin {
	/** Environment variables used by this plugin */
	static readonly envVars: EnvVarRequirement[] = [
		{
			name: 'POLAR_ACCESS_TOKEN',
			required: true,
			description: 'Polar API access token',
		},
		{
			name: 'POLAR_WEBHOOK_SECRET',
			required: true,
			description: 'Polar webhook signing secret',
		},
		{
			name: 'POLAR_ORGANIZATION_ID',
			required: false,
			description: 'Polar organization ID',
		},
	]

	/**
	 * Create a configured plugin provider for MagnetModule.forRoot().
	 * Auto-resolves secret values from environment variables if not provided.
	 *
	 * @example
	 * ```typescript
	 * MagnetModule.forRoot([
	 *   PolarPlugin.forRoot({ currency: 'usd' }),
	 * ])
	 * ```
	 */
	static forRoot(config?: Partial<PolarPluginConfig>): PluginMagnetProvider {
		const resolvedConfig: PolarPluginConfig = {
			accessToken: config?.accessToken ?? process.env.POLAR_ACCESS_TOKEN,
			webhookSecret: config?.webhookSecret ?? process.env.POLAR_WEBHOOK_SECRET,
			organizationId:
				config?.organizationId ?? process.env.POLAR_ORGANIZATION_ID,
			syncProducts: config?.syncProducts,
			currency: config?.currency,
			features: config?.features,
		}

		return {
			type: 'plugin',
			plugin: PolarPlugin,
			options: resolvedConfig as unknown as Record<string, unknown>,
			envVars: PolarPlugin.envVars,
		}
	}
}
