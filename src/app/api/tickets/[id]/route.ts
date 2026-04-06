import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"
import { coreQuery } from "@/lib/core-db"
import { fireTemplateTrigger } from "@/lib/template-triggers"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const ticket = await queryOne<any>("SELECT * FROM tickets WHERE id = ?", [id])
  if (!ticket) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })

  const comments = await query<any>(
    "SELECT * FROM ticket_comments WHERE ticket_id = ? ORDER BY created_at ASC", [id]
  )

  // Resolve user names from portal_core
  const userIds = [
    ticket.requester_id, ticket.assigned_to_user_id,
    ...comments.map((c: any) => c.user_id)
  ].filter(Boolean)
  const uniqueIds = [...new Set(userIds)]
  let userMap: Record<number, { name: string; email: string }> = {}
  if (uniqueIds.length > 0) {
    const users = await coreQuery<any>(`SELECT id, name, email FROM users WHERE id IN (${uniqueIds.join(",")})`)
    userMap = Object.fromEntries(users.map((u: any) => [u.id, { name: u.name, email: u.email }]))
  }

  // Assignees for dropdown (privileged only)
  const isPrivileged = ["admin", "manager", "techniker", "hausmeister"].some(r => session.role.includes(r))
  let assignees: any[] = []
  if (isPrivileged) {
    assignees = await coreQuery("SELECT id, name FROM users WHERE active = 1 ORDER BY name ASC")
  }

  return NextResponse.json({
    ...ticket,
    requester_name: userMap[ticket.requester_id]?.name || "Unbekannt",
    requester_email: userMap[ticket.requester_id]?.email || "",
    assignee_name: ticket.assigned_to_user_id ? userMap[ticket.assigned_to_user_id]?.name || "–" : null,
    comments: comments.map((c: any) => ({
      ...c,
      user_name: c.user_id ? userMap[c.user_id]?.name || "System" : "System",
    })),
    assignees,
  })
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const isPrivileged = ["admin", "manager", "techniker", "hausmeister"].some(r => session.role.includes(r))
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const ticket = await queryOne<any>("SELECT * FROM tickets WHERE id = ?", [id])
  if (!ticket) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })

  const body = await req.json()
  const updates: string[] = []
  const vals: any[] = []
  const systemComments: string[] = []

  const statusLabels: Record<string, string> = { open: "Offen", in_progress: "In Bearbeitung", waiting: "Wartend", resolved: "Gelöst", closed: "Geschlossen" }
  const prioLabels: Record<string, string> = { low: "Niedrig", medium: "Mittel", high: "Hoch", critical: "Kritisch" }

  if (body.status !== undefined && body.status !== ticket.status) {
    updates.push("status = ?"); vals.push(body.status)
    systemComments.push(`Status geändert: ${statusLabels[ticket.status] || ticket.status} → ${statusLabels[body.status] || body.status}`)
    if (body.status === "resolved" && !ticket.resolved_at) updates.push("resolved_at = NOW()")
  }

  if (body.priority !== undefined && body.priority !== ticket.priority) {
    updates.push("priority = ?"); vals.push(body.priority)
    systemComments.push(`Priorität geändert: ${prioLabels[ticket.priority]} → ${prioLabels[body.priority]}`)
  }

  if (body.assigned_to_user_id !== undefined && body.assigned_to_user_id !== ticket.assigned_to_user_id) {
    updates.push("assigned_to_user_id = ?"); vals.push(body.assigned_to_user_id || null)
    if (body.assigned_to_user_id) {
      const assignee = await coreQuery<any>("SELECT name FROM users WHERE id = ?", [body.assigned_to_user_id])
      systemComments.push(`Zugewiesen an: ${assignee[0]?.name || "Unbekannt"}`)
    } else {
      systemComments.push("Zuweisung entfernt")
    }
  }

  if (body.category !== undefined) { updates.push("category = ?"); vals.push(body.category) }

  if (!updates.length) return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 })

  await query(`UPDATE tickets SET ${updates.join(", ")} WHERE id = ?`, [...vals, id])

  for (const msg of systemComments) {
    await query("INSERT INTO ticket_comments (ticket_id, user_id, content, is_system) VALUES (?, ?, ?, 1)", [id, session.userId, msg])
  }

  // Fire template triggers
  if (body.status === "resolved") {
    const requester = await coreQuery<any>("SELECT name, email FROM users WHERE id = ?", [ticket.requester_id])
    fireTemplateTrigger("ticket_resolved", {
      ticket_nummer: ticket.ticket_number,
      ticket_titel: ticket.title,
      ersteller_name: requester[0]?.name,
      ersteller_email: requester[0]?.email,
      agent_name: session.name,
      agent_email: session.email,
      bereich: "facility",
    }, [ticket.requester_id])
  }

  return NextResponse.json({ success: true })
}
