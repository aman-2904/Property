"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface PromotionDistChartProps {
  data: { level: string; count: number }[];
}

const LEVEL_COLORS = [
  "hsl(var(--muted-foreground))",
  "rgb(167,139,250)",
  "rgb(129,140,248)",
  "rgb(99,102,241)",
  "rgb(79,70,229)",
  "hsl(var(--primary))",
  "rgb(139,92,246)",
  "rgb(124,58,237)",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 border border-border/60 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-sm">
        <p className="text-xs font-bold text-muted-foreground">{label}</p>
        <p className="text-sm font-bold text-foreground mt-1">{payload[0].value} agents</p>
      </div>
    );
  }
  return null;
};

export function PromotionDistChart({ data }: PromotionDistChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[260px] flex items-center justify-center text-xs text-muted-foreground">
        No promotion data available.
      </div>
    );
  }

  return (
    <div className="w-full h-[260px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)" />
          <XAxis
            type="number"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="level"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={20}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={LEVEL_COLORS[index % LEVEL_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
