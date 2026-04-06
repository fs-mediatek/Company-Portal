"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const TicketTrendChart = dynamic(
  () => import("@/components/charts/ticket-trend-chart").then(m => ({ default: m.TicketTrendChart })),
  { ssr: false }
)
const TicketCategoryChart = dynamic(
  () => import("@/components/charts/ticket-category-chart").then(m => ({ default: m.TicketCategoryChart })),
  { ssr: false }
)
const VehicleUtilizationChart = dynamic(
  () => import("@/components/charts/vehicle-utilization-chart").then(m => ({ default: m.VehicleUtilizationChart })),
  { ssr: false }
)

export function DashboardCharts() {
  const [area, setArea] = useState<string>("facility")

  useEffect(() => {
    const stored = localStorage.getItem("active_area")
    if (stored) setArea(stored)
  }, [])

  const isFleet = area === "fleet"

  if (isFleet) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Ticket-Verlauf (30 Tage)</CardTitle>
        </CardHeader>
        <CardContent>
          <TicketTrendChart />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Meldungen nach Kategorie</CardTitle>
        </CardHeader>
        <CardContent>
          <TicketCategoryChart />
        </CardContent>
      </Card>
    </div>
  )
}

/* Area-aware stat card icon colors */
export function useAreaColors() {
  const [area, setArea] = useState<string>("facility")

  useEffect(() => {
    const stored = localStorage.getItem("active_area")
    if (stored) setArea(stored)
  }, [])

  const isFleet = area === "fleet"

  return {
    area,
    isFleet,
    accent: isFleet ? "text-blue-500" : "text-primary",
    accentBg: isFleet ? "bg-blue-500/10" : "bg-primary/10",
    accentBorder: isFleet ? "border-blue-500/20" : "border-primary/20",
  }
}

interface AreaIndicatorProps {
  className?: string
}

export function AreaIndicator({ className }: AreaIndicatorProps) {
  const { area, isFleet } = useAreaColors()

  return (
    <div className={cn(
      "h-1 w-full rounded-full",
      isFleet ? "bg-gradient-to-r from-blue-500 to-indigo-500" : "bg-gradient-to-r from-teal-500 to-emerald-500",
      className
    )} />
  )
}
