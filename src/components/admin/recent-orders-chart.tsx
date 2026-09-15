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
import { formatFCFA, formatDate } from "@/lib/format";

type DataPoint = { date: Date; count: number; revenue: number };

export function RecentOrdersChart({ data }: { data: DataPoint[] }) {
  const chartData = data.map((d) => ({
    date: formatDate(d.date),
    short: new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
    count: d.count,
    revenue: d.revenue,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#B8956A" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#B8956A" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="countGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1A1A1A" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#1A1A1A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E2D8" vertical={false} />
          <XAxis
            dataKey="short"
            tick={{ fontSize: 11, fill: "#6B5F52" }}
            axisLine={{ stroke: "#E8E2D8" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6B5F52" }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "#FFFFFF",
              border: "1px solid #1A1A1A",
              borderRadius: 0,
              fontSize: 12,
            }}
            labelStyle={{ fontWeight: 600 }}
            formatter={(value: any, name: string) => {
              if (name === "revenue") return [formatFCFA(Number(value)), "CA"];
              return [String(value), "Commandes"];
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#B8956A"
            strokeWidth={2}
            fill="url(#revGrad)"
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#1A1A1A"
            strokeWidth={1.5}
            fill="url(#countGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
