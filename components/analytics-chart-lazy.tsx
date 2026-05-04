"use client"

import dynamic from "next/dynamic"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Skeleton component for chart loading
function ChartSkeleton() {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-[300px] w-full rounded-lg" />
    </Card>
  )
}

// Lazy load AnalyticsChart (Recharts is heavy)
const AnalyticsChart = dynamic(
  () => import("./analytics-chart").then((mod) => ({ default: mod.AnalyticsChart })),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  }
)

export { AnalyticsChart }







