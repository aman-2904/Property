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

interface SalesChartProps {
  data: { status: string; count: number }[];
}

export function SalesChart({ data }: SalesChartProps) {
  const formattedData = data.map((item) => ({
    name: item.status.replace(/_/g, " "),
    count: item.count,
  }));

  const colors = {
    approved: "hsl(var(--primary))",
    "pending approval": "rgb(245, 158, 11)", // amber
    rejected: "rgb(239, 68, 68)", // rose
  };

  return (
    <div className="w-full h-[250px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formattedData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(255,255,255,0.05)"
          />
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dy={10}
            className="capitalize"
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            dx={-10}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(15, 15, 20, 0.9)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              color: "#fff",
              fontFamily: "var(--font-outfit)",
            }}
            formatter={(value: any) => [value, "Transactions"]}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={50}>
            {formattedData.map((entry, index) => {
              const statusKey = entry.name.toLowerCase();
              const fill = (colors as any)[statusKey] || "hsl(var(--muted-foreground))";
              return <Cell key={`cell-${index}`} fill={fill} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
