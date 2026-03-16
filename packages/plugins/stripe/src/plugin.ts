import { Plugin } from '@magnet-cms/core'
import { StripeModule } from './stripe.module'

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
export class StripePlugin {}
