import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { query } from "@/lib/db"
import Link from "next/link"
import { AlertTriangle, Clock, CheckCircle2, Users, ArrowRight } from "lucide-react"

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const isAdmin = session.role.includes("admin")
  const isManager = session.role.includes("manager")
  const isTechniker = session.role.includes("techniker") || session.role.includes("hausmeister")
  const isPrivileged = isAdmin || isManager

  // Build where clause based on role
  let ticketWhere = ""
  const ticketParams: any[] = []
  if (!isPrivileged) {
    if (isTechniker) {
      ticketWhere = "AND (t.assigned_to_user_id = ? OR t.requester_id = ?)"
      ticketParams.push(session.userId, session.userId)
    } else {
      ticketWhere = "AND t.requester_id = ?"
      ticketParams.push(session.userId)
    }
  }

  // Stats
  const [openCount] = await query<any>(
    `SELECT COUNT(*) as c FROM tickets t WHERE status = 'open' ${ticketWhere}`, ticketParams
  )
  const [inProgressCount] = await query<any>(
    `SELECT COUNT(*) as c FROM tickets t WHERE status = 'in_progress' ${ticketWhere}`, ticketParams
  )
  const [resolvedTodayCount] = await query<any>(
    `SELECT COUNT(*) as c FROM tickets t WHERE status = 'resolved' AND DATE(resolved_at) = CURDATE() ${ticketWhere}`, ticketParams
  )

  let fourthStat: { label: string; value: number; icon: any; color: string }
  if (isPrivileged) {
    const [userCount] = await query<any>('SELECT COUNT(*) as c FROM users WHERE active = 1')
    fourthStat = { label: "Aktive Benutzer", value: userCount.c, icon: Users, color: "bg-blue-500/10 text-blue-600" }
  } else {
    const [myCount] = await query<any>(
      'SELECT COUNT(*) as c FROM tickets WHERE requester_id = ?', [session.userId]
    )
    fourthStat = { label: "Meine Meldungen", value: myCount.c, icon: AlertTriangle, color: "bg-purple-500/10 text-purple-600" }
  }

  const stats = [
    { label: "Offene Meldungen", value: openCount.c, icon: AlertTriangle, color: "bg-amber-500/10 text-amber-600" },
    { label: "In Bearbeitung", value: inProgressCount.c, icon: Clock, color: "bg-primary/10 text-primary" },
    { label: "Heute gelöst", value: resolvedTodayCount.c, icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-600" },
    fourthStat,
  ]

  // Recent tickets
  const recentTickets = await query<any>(
    `SELECT t.*, u.name as requester_name
     FROM tickets t
     LEFT JOIN users u ON t.requester_id = u.id
     WHERE 1=1 ${ticketWhere}
     ORDER BY t.created_at DESC
     LIMIT 8`,
    ticketParams
  )

  const statusLabels: Record<string, string> = {
    open: "Offen", in_progress: "In Bearbeitung", waiting: "Wartend", resolved: "Gelöst", closed: "Geschlossen"
  }
  const statusColors: Record<string, string> = {
    open: "bg-blue-500/10 text-blue-600", in_progress: "bg-purple-500/10 text-purple-600",
    waiting: "bg-amber-500/10 text-amber-600", resolved: "bg-emerald-500/10 text-emerald-600",
    closed: "bg-gray-500/10 text-gray-600"
  }
  const prioColors: Record<string, string> = {
    low: "bg-gray-500/10 text-gray-600", medium: "bg-primary/10 text-primary",
    high: "bg-amber-500/10 text-amber-600", critical: "bg-red-500/10 text-red-600"
  }
  const prioLabels: Record<string, string> = { low: "Niedrig", medium: "Mittel", high: "Hoch", critical: "Kritisch" }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Willkommen zurück, {session.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-3xl font-bold mt-1">{s.value}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent tickets */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="font-semibold">Aktuelle Meldungen</h2>
          <Link href="/tickets" className="text-sm text-primary hover:underline flex items-center gap-1">
            Alle anzeigen <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="px-5 pb-5">
          {recentTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Keine Meldungen vorhanden</p>
          ) : (
            <div className="space-y-2">
              {recentTickets.map((t: any) => (
                <Link
                  key={t.id}
                  href={`/tickets/${t.id}`}
                  className="flex items-center gap-4 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{t.ticket_number}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${prioColors[t.priority]}`}>
                        {prioLabels[t.priority]}
                      </span>
                    </div>
                    <p className="font-medium text-sm truncate mt-0.5">{t.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.requester_name} · {t.category}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0 ${statusColors[t.status]}`}>
                    {statusLabels[t.status]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
