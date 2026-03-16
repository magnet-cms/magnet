import { Plugin } from '@magnet-cms/core'
import { PolarModule } from './polar.module'

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
export class PolarPlugin {}
