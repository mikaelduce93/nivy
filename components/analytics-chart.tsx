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

// Palette charte paper néo-brutaliste (teal / pink / gold / lime / coral).
const COLORS = ["#0f8a8a", "#ff3d80", "#e0a82e", "#7dac3e", "#ff7a4d"]

export function AnalyticsChart({
  data,
  type,
  dataKey,
  xAxisKey = "name",
  title,
  description,
  color = "#0f8a8a",
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
        <h3 className="text-lg font-bold text-ink mb-1">{title}</h3>
        {description && <p className="text-sm text-mute">{description}</p>}
      </div>

      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        {type === "line" && (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey={xAxisKey} stroke="var(--ink)" />
            <YAxis stroke="var(--ink)" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} dot={{ fill: color, r: 4 }} />
          </LineChart>
        )}

        {type === "area" && (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey={xAxisKey} stroke="var(--ink)" />
            <YAxis stroke="var(--ink)" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.3} />
          </AreaChart>
        )}

        {type === "bar" && (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey={xAxisKey} stroke="var(--ink)" />
            <YAxis stroke="var(--ink)" />
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
              fill="var(--teal)"
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
