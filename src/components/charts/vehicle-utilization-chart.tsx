"use client"

import { useEffect, useState } from "react"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { Loader2 } from "lucide-react"

interface StatusData {
  status: string
  label: string
  count: number
}

const STATUS_COLORS: Record<string, string> = {
  verfuegbar: "oklch(0.65 0.17 155)",
  in_nutzung: "oklch(0.6 0.13 250)",
  werkstatt: "oklch(0.7 0.15 80)",
  ausgemustert: "oklch(0.55 0.03 250)",
}

export function VehicleUtilizationChart() {
  const [data, setData] = useState<StatusData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/stats?type=vehicle-status")
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

  if (data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">Keine Fahrzeuge vorhanden</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          strokeWidth={0}
        >
          {data.map((entry) => (
            <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "oklch(0.5 0.05 170)"} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
            fontSize: "13px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
