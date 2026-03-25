import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@magnet-cms/ui/components'
import type { ChartConfig } from '@magnet-cms/ui/components'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

interface RevenueChartProps {
  data: Array<{ month: string; revenue: number }>
}

const chartConfig: ChartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--chart-1))',
  },
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={formatCurrency} />
        <ChartTooltip
          content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
        />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
