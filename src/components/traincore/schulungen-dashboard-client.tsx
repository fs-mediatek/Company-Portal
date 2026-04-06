"use client"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, GraduationCap, BookOpen, CheckCircle2, AlertTriangle, CircleDashed, CircleDot, Clock, CalendarDays, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

const statusColors: Record<string, string> = {
  assigned: "bg-blue-500/10 text-blue-600 border-blue-200",
  in_progress: "bg-amber-500/10 text-amber-600 border-amber-200",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  overdue: "bg-red-500/10 text-red-600 border-red-200",
}
const statusLabels: Record<string, string> = {
  assigned: "Zugewiesen",
  in_progress: "In Bearbeitung",
  completed: "Abgeschlossen",
  overdue: "Überfällig",
}
const statusIcons: Record<string, any> = {
  assigned: CircleDashed,
  in_progress: CircleDot,
  completed: CheckCircle2,
  overdue: AlertTriangle,
}

export function SchulungenDashboardClient() {
  const [assignments, setAssignments] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/schulungen/my-assignments")
      .then(r => r.json())
      .then(data => {
        setAssignments(data.assignments || [])
        setStats(data.stats || {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  const active = assignments.filter(a => a.status !== "completed")
  const completed = assignments.filter(a => a.status === "completed")

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Gesamt", value: stats?.total ?? 0, color: "text-foreground" },
          { label: "In Bearbeitung", value: stats?.in_progress ?? 0, color: "text-amber-600" },
          { label: "Abgeschlossen", value: stats?.completed ?? 0, color: "text-emerald-600" },
          { label: "Überfällig", value: stats?.overdue ?? 0, color: "text-red-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active assignments */}
      {active.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Aktive Schulungen</h2>
          <div className="space-y-2">
            {active.map(a => {
              const StatusIcon = statusIcons[a.status] || CircleDashed
              const dueDate = a.due_date ? new Date(a.due_date) : null
              const progress = Number(a.progress_percent || 0)
              return (
                <Card key={a.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600/10">
                        <GraduationCap className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">{a.title}</p>
                            <p className="text-xs text-muted-foreground">{a.category}{a.instructor_name ? ` · ${a.instructor_name}` : ""}</p>
                          </div>
                          <Badge variant="outline" className={cn("shrink-0 text-xs", statusColors[a.status])}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusLabels[a.status] || a.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", progress >= 100 ? "bg-emerald-500" : "bg-amber-500")}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{a.chapter_count} Kapitel</span>
                            {a.duration_minutes > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{a.duration_minutes} Min.</span>}
                            {dueDate && (
                              <span className={cn("flex items-center gap-1", a.status === "overdue" ? "text-red-600 font-medium" : "")}>
                                <CalendarDays className="h-3 w-3" />
                                {dueDate.toLocaleDateString("de-DE")}
                              </span>
                            )}
                          </div>
                          <Link href={`/schulungen/modules/${a.course_id}`}>
                            <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700">
                              {a.status === "in_progress" ? "Weiter" : "Starten"}
                              <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Abgeschlossen</h2>
          <div className="space-y-2">
            {completed.map(a => (
              <Card key={a.id} className="opacity-70">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.category}</p>
                    </div>
                    <Link href={`/schulungen/modules/${a.course_id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">Ansehen</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {assignments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <GraduationCap className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium text-sm">Keine Schulungen zugewiesen</p>
            <p className="text-xs mt-1">Dir wurden noch keine Schulungsmodule zugewiesen.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
