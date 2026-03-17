import type {
	EnvVarRequirement,
	PluginMagnetProvider,
} from '@magnet-cms/common'
import { Plugin } from '@magnet-cms/core'
import { StripeModule } from './stripe.module'
import type { StripePluginConfig } from './types'

/**
 * Stripe Plugin
 *
 * Provides Stripe payment integration for Magnet CMS:
 * - Product, price, subscription, and customer management
 * - Webhook processing with idempotency
 * - Checkout and Customer Portal sessions
 * - Admin dashboard with revenue metrics
 * - User subscription access and feature flags
 */
@Plugin({
	name: 'stripe',
	description: 'Stripe payments plugin for Magnet CMS',
	version: '0.1.0',
	module: StripeModule,
	frontend: {
		routes: [
			{
				path: 'stripe',
				componentId: 'StripeDashboard',
				requiresAuth: true,
				children: [
					{ path: '', componentId: 'StripeDashboard' },
					{ path: 'customers', componentId: 'StripeCustomers' },
					{ path: 'products', componentId: 'StripeProducts' },
					{ path: 'subscriptions', componentId: 'StripeSubscriptions' },
					{ path: 'payments', componentId: 'StripePayments' },
				],
			},
		],
		sidebar: [
			{
				id: 'stripe',
				title: 'Stripe Payments',
				url: '/stripe',
				icon: 'CreditCard',
				order: 30,
				items: [
					{
						id: 'stripe-dashboard',
						title: 'Dashboard',
						url: '/stripe',
						icon: 'BarChart3',
					},
					{
						id: 'stripe-customers',
						title: 'Customers',
						url: '/stripe/customers',
						icon: 'Users',
					},
					{
						id: 'stripe-products',
						title: 'Products',
						url: '/stripe/products',
						icon: 'Package',
					},
					{
						id: 'stripe-subscriptions',
						title: 'Subscriptions',
						url: '/stripe/subscriptions',
						icon: 'RefreshCw',
					},
					{
						id: 'stripe-payments',
						title: 'Payments',
						url: '/stripe/payments',
						icon: 'Receipt',
					},
				],
			},
		],
	},
})
export class StripePlugin {
	/** Environment variables used by this plugin */
	static readonly envVars: EnvVarRequirement[] = [
		{
			name: 'STRIPE_SECRET_KEY',
			required: true,
			description: 'Stripe API secret key',
		},
		{
			name: 'STRIPE_WEBHOOK_SECRET',
			required: true,
			description: 'Stripe webhook signing secret',
		},
		{
			name: 'STRIPE_PUBLISHABLE_KEY',
			required: false,
			description: 'Stripe publishable key',
		},
	]

	/**
	 * Create a configured plugin provider for MagnetModule.forRoot().
	 * Auto-resolves secret values from environment variables if not provided.
	 *
	 * @example
	 * ```typescript
	 * MagnetModule.forRoot([
	 *   StripePlugin.forRoot({ currency: 'usd' }),
	 * ])
	 * ```
	 */
	static forRoot(config?: Partial<StripePluginConfig>): PluginMagnetProvider {
		const resolvedConfig: StripePluginConfig = {
			secretKey: config?.secretKey ?? process.env.STRIPE_SECRET_KEY,
			webhookSecret: config?.webhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET,
			publishableKey:
				config?.publishableKey ?? process.env.STRIPE_PUBLISHABLE_KEY,
			syncProducts: config?.syncProducts,
			portalEnabled: config?.portalEnabled,
			currency: config?.currency,
			features: config?.features,
		}

		return {
			type: 'plugin',
			plugin: StripePlugin,
			options: resolvedConfig as unknown as Record<string, unknown>,
			envVars: StripePlugin.envVars,
		}
	}
}
