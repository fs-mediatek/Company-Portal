"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const TicketTrendChart = dynamic(
  () => import("@/components/helpdesk/hd-trend-chart").then(m => ({ default: m.HdTrendChart })),
  { ssr: false }
)
const TicketCategoryChart = dynamic(
  () => import("@/components/helpdesk/hd-category-chart").then(m => ({ default: m.HdCategoryChart })),
  { ssr: false }
)

export function HelpdeskDashboardCharts() {
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
          <CardTitle className="text-sm font-semibold">Tickets nach Kategorie</CardTitle>
        </CardHeader>
        <CardContent>
          <TicketCategoryChart />
        </CardContent>
      </Card>
    </div>
  )
}
