"use client"
import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, BarChart3, Clock, Star, TrendingUp } from "lucide-react"

const AreaChart = dynamic(() => import("recharts").then(m => m.AreaChart), { ssr: false })
const Area = dynamic(() => import("recharts").then(m => m.Area), { ssr: false })
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false })

const statusLabels: Record<string, string> = { open: "Offen", pending: "Wartend", in_progress: "In Bearbeitung", resolved: "Gelöst", closed: "Geschlossen" }
const priorityLabels: Record<string, string> = { critical: "Kritisch", high: "Hoch", medium: "Mittel", low: "Niedrig" }

export function HelpdeskAnalyticsClient() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/helpdesk/analytics?range=30").then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!data) return null

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-bold">Ticket-Analytik</h1><p className="text-muted-foreground text-sm mt-0.5">Leistungskennzahlen der letzten 30 Tage</p></div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><BarChart3 className="h-4 w-4" /><span className="text-xs">Gesamt</span></div>
          <p className="text-3xl font-bold">{data.overview.total}</p>
          <p className="text-xs text-muted-foreground mt-1">{data.overview.open} offen</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><TrendingUp className="h-4 w-4" /><span className="text-xs">Gelöst (30T)</span></div>
          <p className="text-3xl font-bold text-emerald-600">{data.overview.resolved_period}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Clock className="h-4 w-4" /><span className="text-xs">Ø Lösungszeit</span></div>
          <p className="text-3xl font-bold">{data.overview.avg_resolution_hours}h</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Star className="h-4 w-4" /><span className="text-xs">Ø Zufriedenheit</span></div>
          <p className="text-3xl font-bold">{data.overview.avg_satisfaction || "–"}</p>
          <p className="text-xs text-muted-foreground mt-1">{data.overview.total_rated} Bewertungen</p>
        </CardContent></Card>
      </div>

      {/* Trend Chart */}
      {data.trend?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Ticket-Verlauf (30 Tage)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="anGradCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="anGradResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "0.75rem", fontSize: "13px" }} />
                <Area type="monotone" dataKey="created" name="Erstellt" stroke="#a855f7" strokeWidth={2} fill="url(#anGradCreated)" />
                <Area type="monotone" dataKey="resolved" name="Gelöst" stroke="#10b981" strokeWidth={2} fill="url(#anGradResolved)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* By Status */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Nach Status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.by_status?.map((s: any) => (
              <div key={s.status} className="flex items-center justify-between text-sm">
                <span>{statusLabels[s.status] || s.status}</span>
                <Badge variant="outline" className="tabular-nums">{s.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* By Category */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Nach Kategorie</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.by_category?.map((c: any) => (
              <div key={c.category} className="flex items-center justify-between text-sm">
                <span>{c.category}</span>
                <Badge variant="outline" className="tabular-nums">{c.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Agents */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Top-Agenten (30T)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.agents?.length === 0 ? <p className="text-sm text-muted-foreground">Keine Daten</p> : null}
            {data.agents?.map((a: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{a.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Ø {a.avg_hours}h</span>
                  <Badge variant="outline" className="tabular-nums">{a.resolved} gelöst</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
