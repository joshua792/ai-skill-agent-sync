"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

interface DownloadChartProps {
  data: { date: string; downloads: number }[];
}

export function DownloadChart({ data }: DownloadChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Download Trends (30 days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border"
            />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => v.slice(5)}
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              allowDecimals={false}
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--popover-foreground))",
              }}
            />
            <Area
              type="monotone"
              dataKey="downloads"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary) / 0.1)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
