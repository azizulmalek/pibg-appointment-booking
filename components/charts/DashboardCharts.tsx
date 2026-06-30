"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = ["#0F766E", "#CBD5E1"];

export function AppointmentPieChart({ booked, total }: { booked: number; total: number }) {
  const data = [
    { name: "Sudah Tempah", value: booked },
    { name: "Belum Tempah", value: Math.max(0, total - booked) },
  ];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ReasonBarChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" fill="#0F766E" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BookingHeatmap({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="grid grid-cols-7 gap-1">
      {data.map((d) => (
        <div
          key={d.date}
          title={`${d.date}: ${d.count} temujanji`}
          className="aspect-square rounded-md"
          style={{
            backgroundColor: `rgba(15, 118, 110, ${0.15 + (d.count / max) * 0.85})`,
          }}
        />
      ))}
    </div>
  );
}
