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
  Legend,
} from "recharts";

interface VisitTrendsChartProps {
  data: { month: string; physical: number; virtual: number }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 border border-border/60 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-sm">
        <p className="text-xs font-bold text-muted-foreground mb-2">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs font-semibold capitalize" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function VisitTrendsChart({ data }: VisitTrendsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[240px] flex items-center justify-center text-xs text-muted-foreground">
        No visit data available.
      </div>
    );
  }

  return (
    <div className="w-full h-[240px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
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
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", paddingTop: "8px" }}
          />
          <Bar dataKey="physical" name="physical" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
          <Bar dataKey="virtual" name="virtual" stackId="a" fill="rgb(167,139,250)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
