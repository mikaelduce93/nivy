"use client"

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { Card } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface AnalyticsChartProps {
  data: any[]
  type: "line" | "area" | "bar" | "pie"
  dataKey: string
  xAxisKey?: string
  title: string
  description?: string
  color?: string
  colors?: string[]
}

const COLORS = ["#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"]

export function AnalyticsChart({
  data,
  type,
  dataKey,
  xAxisKey = "name",
  title,
  description,
  color = "#06b6d4",
  colors = COLORS,
}: AnalyticsChartProps) {
  const chartConfig = {
    [dataKey]: {
      label: title,
      color: color,
    },
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        {description && <p className="text-sm text-zinc-400">{description}</p>}
      </div>

      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        {type === "line" && (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey={xAxisKey} stroke="#71717a" />
            <YAxis stroke="#71717a" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} dot={{ fill: color, r: 4 }} />
          </LineChart>
        )}

        {type === "area" && (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey={xAxisKey} stroke="#71717a" />
            <YAxis stroke="#71717a" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.3} />
          </AreaChart>
        )}

        {type === "bar" && (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey={xAxisKey} stroke="#71717a" />
            <YAxis stroke="#71717a" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} />
          </BarChart>
        )}

        {type === "pie" && (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey={dataKey}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        )}
      </ChartContainer>
    </Card>
  )
}
