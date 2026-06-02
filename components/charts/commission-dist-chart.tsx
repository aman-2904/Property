"use client";

import * as React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CommissionDistChartProps {
  data: { status: string; amount: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "rgb(245, 158, 11)",
  approved: "hsl(var(--primary))",
  paid: "rgb(34, 197, 94)",
  rejected: "rgb(239, 68, 68)",
  cancelled: "rgb(113, 113, 122)",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0];
    return (
      <div className="bg-card/95 border border-border/60 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-sm">
        <p className="text-xs font-bold capitalize" style={{ color: d.payload.fill }}>
          {d.name}
        </p>
        <p className="text-sm font-bold text-foreground mt-1">
          ${Number(d.value).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function CommissionDistChart({ data }: CommissionDistChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[240px] flex items-center justify-center text-xs text-muted-foreground">
        No commission data available.
      </div>
    );
  }

  const formatted = data.map((d) => ({
    name: d.status.charAt(0).toUpperCase() + d.status.slice(1),
    value: d.amount,
    fill: STATUS_COLORS[d.status] || "hsl(var(--muted-foreground))",
  }));

  return (
    <div className="w-full h-[240px] mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={formatted}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
            labelLine={false}
            label={renderCustomLabel}
          >
            {formatted.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={entry.fill} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", paddingTop: "8px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
