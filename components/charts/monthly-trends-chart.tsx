"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface MonthlyTrendsChartProps {
  data: { month: string; volume: number; count: number }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 border border-border/60 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-sm">
        <p className="text-xs font-bold text-muted-foreground mb-2">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs font-semibold" style={{ color: entry.color }}>
            {entry.name === "volume"
              ? `Volume: $${Number(entry.value).toLocaleString("en-US")}`
              : `Sales: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function MonthlyTrendsChart({ data }: MonthlyTrendsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[260px] flex items-center justify-center text-xs text-muted-foreground">
        No sales data available yet.
      </div>
    );
  }

  return (
    <div className="w-full h-[260px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="countGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgb(167,139,250)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="rgb(167,139,250)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="month"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis
            yAxisId="left"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", paddingTop: "8px" }}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="volume"
            name="volume"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#volumeGrad)"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="count"
            name="count"
            stroke="rgb(167,139,250)"
            strokeWidth={2}
            fill="url(#countGrad)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
