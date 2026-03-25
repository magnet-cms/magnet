/**
 * Stripe Plugin - Frontend Entry
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

interface _PluginRegistration {
  manifest: FrontendPluginManifest
  components: Record<string, () => Promise<{ default: ComponentType<unknown> }>>
}

const manifest: FrontendPluginManifest = {
  pluginName: 'stripe',
  routes: [
    {
      path: 'stripe',
      componentId: 'StripeDashboard',
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
}

const components: Record<string, () => Promise<{ default: ComponentType<unknown> }>> = {
  StripeDashboard: () => import('./pages/stripe-dashboard'),
  StripeCustomers: () => import('./pages/customers'),
  StripeProducts: () => import('./pages/products'),
  StripeSubscriptions: () => import('./pages/subscriptions'),
  StripePayments: () => import('./pages/payments'),
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

export const stripePlugin = () => ({ manifest, components })
export default stripePlugin
