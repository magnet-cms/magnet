import { PageContent, PageHeader, useAdapter } from '@magnet-cms/admin'
import { Card, Skeleton } from '@magnet-cms/ui/components'
import { useEffect, useState } from 'react'

import { RecentOrders } from '../components/recent-orders'
import { RevenueChart } from '../components/revenue-chart'
import { SubscriptionMetrics } from '../components/subscription-metrics'

interface MetricsData {
  mrr: number
  revenueThisMonth: number
  activeSubscriptions: number
  churnRate: number
  revenueByMonth: Array<{ month: string; revenue: number }>
  recentOrders: Array<{
    id: string
    totalAmount: number
    currency: string
    status: string
    customerEmail: string
    createdAt: string
  }>
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['mrr', 'revenue', 'subscriptions', 'churn'].map((id) => (
          <Skeleton key={id} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-[300px]" />
      <Skeleton className="h-[200px]" />
    </div>
  )
}

const PolarDashboard = () => {
  const adapter = useAdapter()
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const data = await adapter.request<MetricsData>('/polar/admin/metrics')
        setMetrics(data)
      } catch (error) {
        console.error('[Polar] Failed to fetch metrics:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
  }, [adapter])

  return (
    <>
      <PageHeader title="Polar Dashboard" />
      <PageContent>
        {loading || !metrics ? (
          <DashboardSkeleton />
        ) : (
          <div className="space-y-6 p-6">
            <SubscriptionMetrics
              mrr={metrics.mrr}
              revenueThisMonth={metrics.revenueThisMonth}
              activeSubscriptions={metrics.activeSubscriptions}
              churnRate={metrics.churnRate}
            />

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Revenue (Last 12 Months)</h3>
              <RevenueChart data={metrics.revenueByMonth} />
            </Card>

            <div>
              <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
              <RecentOrders orders={metrics.recentOrders} />
            </div>
          </div>
        )}
      </PageContent>
    </>
  )
}

export default PolarDashboard
