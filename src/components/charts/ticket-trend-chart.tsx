"use client"

import { useEffect, useState } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { Loader2 } from "lucide-react"

interface TrendData {
  date: string
  created: number
  resolved: number
}

export function TicketTrendChart() {
  const [data, setData] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/stats?type=ticket-trend&range=30d")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">Keine Daten verfügbar</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.55 0.14 170)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="oklch(0.55 0.14 170)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradResolved" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.65 0.17 155)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="oklch(0.65 0.17 155)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
            fontSize: "13px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
          labelStyle={{ fontWeight: 600, marginBottom: 4 }}
        />
        <Area
          type="monotone"
          dataKey="created"
          name="Erstellt"
          stroke="oklch(0.55 0.14 170)"
          strokeWidth={2}
          fill="url(#gradCreated)"
        />
        <Area
          type="monotone"
          dataKey="resolved"
          name="Gelöst"
          stroke="oklch(0.65 0.17 155)"
          strokeWidth={2}
          fill="url(#gradResolved)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
