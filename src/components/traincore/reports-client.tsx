"use client"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Search, Loader2, AlertCircle, BookOpen, Users, CheckCircle2, AlertTriangle } from "lucide-react"

function rateColor(rate: number) {
  if (rate >= 80) return "text-emerald-600"
  if (rate >= 50) return "text-amber-600"
  return "text-red-600"
}

export function ReportsClient({ userRole }: { userRole: string }) {
  const [stats, setStats] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchCourses, setSearchCourses] = useState("")
  const [searchEmployees, setSearchEmployees] = useState("")

  async function fetchData() {
    setLoading(true)
    try {
      const [reportsRes, coursesRes] = await Promise.all([
        fetch("/api/traincore/reports"),
        fetch("/api/traincore/courses"),
      ])
      const reportsData = await reportsRes.json()
      const coursesData = await coursesRes.json()
      setStats(reportsData.stats || reportsData)
      setEmployees(reportsData.employees || [])
      setCourses(coursesData.courses || coursesData.data || [])
    } catch (e) {
      console.error("Failed to fetch reports", e)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filteredCourses = courses.filter((c: any) =>
    (c.name || c.title || "").toLowerCase().includes(searchCourses.toLowerCase()) ||
    (c.category || "").toLowerCase().includes(searchCourses.toLowerCase())
  )

  const filteredEmployees = employees.filter((e: any) =>
    (e.name || "").toLowerCase().includes(searchEmployees.toLowerCase()) ||
    (e.email || "").toLowerCase().includes(searchEmployees.toLowerCase())
  )

  const totalModules = Number(stats?.total_modules || 0)
  const activeAssignments = Number(stats?.active_assignments || 0)
  const completedAssignments = Number(stats?.completed_assignments || 0)
  const overdueAssignments = Number(stats?.overdue_assignments || 0)
  const completionRate = activeAssignments > 0
    ? Math.round((completedAssignments / activeAssignments) * 100)
    : 0

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Schulungsberichte</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Übersicht über Fortschritt und Abschlussraten</p>
      </div>

      {/* Statistik Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-purple-600" />
              <p className="text-xs text-muted-foreground">Gesamt Module</p>
            </div>
            <p className="text-2xl font-bold">{totalModules}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-600" />
              <p className="text-xs text-muted-foreground">Aktive Zuweisungen</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{activeAssignments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <p className="text-xs text-muted-foreground">Abschlussrate</p>
            </div>
            <p className={`text-2xl font-bold ${rateColor(completionRate)}`}>{completionRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <p className="text-xs text-muted-foreground">Überfällige Schulungen</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{overdueAssignments}</p>
          </CardContent>
        </Card>
      </div>

      {/* Schulungsübersicht */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Schulungsübersicht</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Module suchen..."
              className="pl-9 w-64"
              value={searchCourses}
              onChange={e => setSearchCourses(e.target.value)}
            />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            {filteredCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Keine Module gefunden</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modul</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead className="text-center">Teilnehmer</TableHead>
                    <TableHead className="text-center">Abgeschlossen</TableHead>
                    <TableHead className="text-center">Überfällig</TableHead>
                    <TableHead className="text-center">Abschlussrate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((c: any) => {
                    const participants = Number(c.participants || c.total_assignments || 0)
                    const completed = Number(c.completed || c.completed_count || 0)
                    const overdue = Number(c.overdue || c.overdue_count || 0)
                    const rate = participants > 0 ? Math.round((completed / participants) * 100) : 0
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name || c.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.category || "–"}</TableCell>
                        <TableCell className="text-center tabular-nums">{participants}</TableCell>
                        <TableCell className="text-center">
                          <span className="text-emerald-600 tabular-nums font-medium">{completed}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {overdue > 0 ? (
                            <span className="text-red-600 tabular-nums font-medium">{overdue}</span>
                          ) : (
                            <span className="text-muted-foreground tabular-nums">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`tabular-nums font-semibold ${rateColor(rate)}`}>{rate}%</span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mitarbeiter-Fortschritt */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mitarbeiter-Fortschritt</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Mitarbeiter suchen..."
              className="pl-9 w-64"
              value={searchEmployees}
              onChange={e => setSearchEmployees(e.target.value)}
            />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            {filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Keine Mitarbeiterdaten verfügbar</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mitarbeiter</TableHead>
                    <TableHead className="text-center">Zugewiesene Module</TableHead>
                    <TableHead className="text-center">Abgeschlossen</TableHead>
                    <TableHead className="text-center">Offen</TableHead>
                    <TableHead className="text-center">Überfällig</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((e: any) => {
                    const assigned = Number(e.assigned || e.total || 0)
                    const completed = Number(e.completed || 0)
                    const open = Number(e.open || e.in_progress || 0)
                    const overdue = Number(e.overdue || 0)
                    return (
                      <TableRow key={e.id || e.user_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{e.name}</p>
                            {e.email && <p className="text-xs text-muted-foreground">{e.email}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">{assigned}</TableCell>
                        <TableCell className="text-center">
                          <span className="text-emerald-600 tabular-nums font-medium">{completed}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-amber-600 tabular-nums font-medium">{open}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {overdue > 0 ? (
                            <Badge variant="destructive">{overdue}</Badge>
                          ) : (
                            <span className="text-muted-foreground tabular-nums">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
