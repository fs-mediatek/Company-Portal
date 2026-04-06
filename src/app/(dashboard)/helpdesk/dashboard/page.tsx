import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hdQuery } from "@/lib/helpdesk-db"
import { coreQuery } from "@/lib/core-db"
import Link from "next/link"
import { ArrowRight, User2, AlertTriangle } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { QuickTicketButton } from "@/components/helpdesk/quick-ticket-button"

export default async function HelpdeskDashboardPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  let openCount = 0, inProgressCount = 0, resolvedToday = 0, assetCount = 0

  try {
    const [o] = await hdQuery<any>("SELECT COUNT(*) as c FROM tickets WHERE status = 'open'")
    openCount = o?.c || 0
    const [p] = await hdQuery<any>("SELECT COUNT(*) as c FROM tickets WHERE status = 'in_progress'")
    inProgressCount = p?.c || 0
    const [r] = await hdQuery<any>("SELECT COUNT(*) as c FROM tickets WHERE status = 'resolved' AND DATE(resolved_at) = CURDATE()")
    resolvedToday = r?.c || 0
    const [a] = await hdQuery<any>("SELECT COUNT(*) as c FROM assets WHERE active = 1")
    assetCount = a?.c || 0
  } catch {}

  const stats = [
    { label: "Offene Tickets", value: openCount, iconKey: "alert" },
    { label: "In Bearbeitung", value: inProgressCount, iconKey: "clock" },
    { label: "Heute gelöst", value: resolvedToday, iconKey: "check" },
    { label: "Geräte gesamt", value: assetCount, iconKey: "users" },
  ]

  // Open tickets: unassigned first, then by priority, then by date
  let openTickets: any[] = []
  try {
    openTickets = await hdQuery<any>(
      `SELECT t.*,
        CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END as prio_sort
       FROM tickets t
       WHERE t.status IN ('open', 'in_progress', 'pending')
       ORDER BY (t.assignee_id IS NULL) DESC, prio_sort ASC, t.created_at ASC
       LIMIT 15`
    )
  } catch {}

  // Load assignee names
  const assigneeIds = [...new Set(openTickets.filter(t => t.assignee_id).map(t => t.assignee_id))]
  const assigneeMap: Record<number, string> = {}
  if (assigneeIds.length > 0) {
    try {
      const users = await coreQuery<any>(`SELECT id, name FROM users WHERE id IN (${assigneeIds.join(",")})`)
      users.forEach((u: any) => { assigneeMap[u.id] = u.name })
    } catch {}
  }

  const statusLabels: Record<string, string> = {
    open: "Offen", pending: "Wartend", in_progress: "In Bearbeitung", resolved: "Gelöst", closed: "Geschlossen"
  }
  const statusColors: Record<string, string> = {
    open: "bg-purple-500/10 text-purple-600", in_progress: "bg-violet-500/10 text-violet-600",
    pending: "bg-amber-500/10 text-amber-600", resolved: "bg-emerald-500/10 text-emerald-600",
    closed: "bg-gray-500/10 text-gray-600"
  }
  const priorityLabels: Record<string, string> = {
    critical: "Kritisch", high: "Hoch", medium: "Mittel", low: "Niedrig"
  }
  const priorityColors: Record<string, string> = {
    critical: "text-red-500", high: "text-orange-500", medium: "text-yellow-500", low: "text-muted-foreground"
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardHeader name={session.name} stats={stats} action={<QuickTicketButton />} />

      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="font-semibold">Offene Aufgaben</h2>
          <Link href="/helpdesk/tickets" className="text-sm text-purple-500 hover:underline flex items-center gap-1">
            Alle Tickets <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="px-5 pb-5">
          {openTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Keine offenen Tickets vorhanden</p>
          ) : (
            <div className="space-y-2">
              {openTickets.map((t: any) => (
                <Link
                  key={t.id}
                  href={`/helpdesk/tickets/${t.id}`}
                  className="flex items-center gap-4 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                >
                  {/* Priority indicator */}
                  <div className={`shrink-0 ${priorityColors[t.priority] || "text-muted-foreground"}`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{t.ticket_number}</span>
                      {!t.assignee_id && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-medium">Nicht zugewiesen</span>
                      )}
                    </div>
                    <p className="font-medium text-sm truncate mt-0.5">{t.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">{t.category}</span>
                      {t.assignee_id && assigneeMap[t.assignee_id] && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User2 className="h-3 w-3" /> {assigneeMap[t.assignee_id]}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[t.status] || ""}`}>
                      {statusLabels[t.status] || t.status}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {priorityLabels[t.priority] || t.priority}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
