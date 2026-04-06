import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery } from "@/lib/helpdesk-db"
import { coreQuery } from "@/lib/core-db"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const isPrivileged = session.role.includes("admin") || session.role.includes("agent") || session.role.includes("manager")
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const range = req.nextUrl.searchParams.get("range") || "30"
  const days = parseInt(range) || 30

  // Overview stats
  const [total] = await hdQuery<any>("SELECT COUNT(*) as c FROM tickets")
  const [open] = await hdQuery<any>("SELECT COUNT(*) as c FROM tickets WHERE status IN ('open','pending','in_progress')")
  const [resolved] = await hdQuery<any>(`SELECT COUNT(*) as c FROM tickets WHERE status IN ('resolved','closed') AND resolved_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`)
  const [avgResolution] = await hdQuery<any>("SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours FROM tickets WHERE resolved_at IS NOT NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)")

  // By status
  const byStatus = await hdQuery("SELECT status, COUNT(*) as count FROM tickets GROUP BY status ORDER BY count DESC")

  // By category
  const byCategory = await hdQuery("SELECT category, COUNT(*) as count FROM tickets GROUP BY category ORDER BY count DESC")

  // By priority
  const byPriority = await hdQuery("SELECT priority, COUNT(*) as count FROM tickets GROUP BY priority ORDER BY FIELD(priority, 'critical','high','medium','low')")

  // Daily trend
  const trend = await hdQuery<any>(
    `SELECT DATE(created_at) as date, COUNT(*) as created,
     SUM(CASE WHEN status IN ('resolved','closed') THEN 1 ELSE 0 END) as resolved
     FROM tickets WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)
     GROUP BY DATE(created_at) ORDER BY date ASC`
  )

  // Top agents (by resolved tickets)
  const agentStats = await hdQuery<any>(
    `SELECT assignee_id, COUNT(*) as resolved_count,
     AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours
     FROM tickets WHERE assignee_id IS NOT NULL AND resolved_at IS NOT NULL
     AND created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
     GROUP BY assignee_id ORDER BY resolved_count DESC LIMIT 10`
  )

  // Resolve agent names
  const agentIds = agentStats.map((a: any) => a.assignee_id).filter(Boolean)
  let agentMap: Record<number, string> = {}
  if (agentIds.length > 0) {
    const users = await coreQuery<any>(`SELECT id, name FROM users WHERE id IN (${agentIds.join(",")})`)
    agentMap = Object.fromEntries(users.map((u: any) => [u.id, u.name]))
  }

  // Satisfaction stats
  const [satisfaction] = await hdQuery<any>(
    "SELECT AVG(satisfaction_rating) as avg_rating, COUNT(satisfaction_rating) as total_rated FROM tickets WHERE satisfaction_rating IS NOT NULL"
  )

  return NextResponse.json({
    overview: {
      total: total?.c || 0,
      open: open?.c || 0,
      resolved_period: resolved?.c || 0,
      avg_resolution_hours: Math.round(avgResolution?.avg_hours || 0),
      avg_satisfaction: satisfaction?.avg_rating ? parseFloat(satisfaction.avg_rating).toFixed(1) : null,
      total_rated: satisfaction?.total_rated || 0,
    },
    by_status: byStatus,
    by_category: byCategory,
    by_priority: byPriority,
    trend: trend.map((t: any) => ({
      date: new Date(t.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
      created: Number(t.created),
      resolved: Number(t.resolved),
    })),
    agents: agentStats.map((a: any) => ({
      name: agentMap[a.assignee_id] || `User #${a.assignee_id}`,
      resolved: a.resolved_count,
      avg_hours: Math.round(a.avg_hours || 0),
    })),
  })
}
