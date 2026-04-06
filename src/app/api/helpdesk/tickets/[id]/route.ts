import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery, hdInsert } from "@/lib/helpdesk-db"
import { coreQuery } from "@/lib/core-db"
import { fireTemplateTrigger } from "@/lib/template-triggers"

const statusLabels: Record<string, string> = {
  open: "Offen", pending: "Wartend", in_progress: "In Bearbeitung", resolved: "Gelöst", closed: "Geschlossen"
}
const priorityLabels: Record<string, string> = {
  low: "Niedrig", medium: "Mittel", high: "Hoch", critical: "Kritisch"
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const { id } = await params
  const ticket = await hdQuery<any>("SELECT * FROM tickets WHERE id = ?", [id])
  if (!ticket.length) return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 })

  const t = ticket[0]
  const comments = await hdQuery<any>(
    "SELECT * FROM ticket_comments WHERE ticket_id = ? ORDER BY created_at ASC", [id]
  )
  const checklist = await hdQuery<any>(
    "SELECT * FROM ticket_checklist WHERE ticket_id = ? ORDER BY sort_order ASC, id ASC", [id]
  )

  // Resolve user names from portal_core
  const userIds = [
    t.requester_id, t.assignee_id, t.affected_user_id,
    ...comments.map((c: any) => c.user_id)
  ].filter(Boolean)
  const uniqueIds = [...new Set(userIds)]
  let userMap: Record<number, { name: string; email: string }> = {}
  if (uniqueIds.length > 0) {
    const users = await coreQuery<any>(`SELECT id, name, email FROM users WHERE id IN (${uniqueIds.join(",")})`)
    userMap = Object.fromEntries(users.map((u: any) => [u.id, { name: u.name, email: u.email }]))
  }

  // All users list for assignment dropdowns (privileged only)
  const isPrivileged = session.role.includes("admin") || session.role.includes("agent")
  let allUsers: any[] = []
  if (isPrivileged) {
    allUsers = await coreQuery("SELECT id, name, email FROM users WHERE active = 1 ORDER BY name ASC")
  }

  return NextResponse.json({
    ...t,
    requester_name: userMap[t.requester_id]?.name || "Unbekannt",
    requester_email: userMap[t.requester_id]?.email || "",
    assignee_name: t.assignee_id ? userMap[t.assignee_id]?.name || "–" : null,
    affected_user_name: t.affected_user_id ? userMap[t.affected_user_id]?.name || null : null,
    comments: comments.map((c: any) => ({
      ...c,
      author_name: c.user_id ? userMap[c.user_id]?.name || "System" : "System",
    })),
    checklist,
    all_users: allUsers,
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const { id } = await params
  const isPrivileged = session.role.includes("admin") || session.role.includes("agent")
  if (!isPrivileged) return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 })

  // Get current ticket for comparison
  const [current] = await hdQuery<any>("SELECT * FROM tickets WHERE id = ?", [id])
  if (!current) return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 })

  const body = await req.json()
  const allowed = ["status", "priority", "assignee_id", "affected_user_id", "title", "description", "category"]
  const sets: string[] = []
  const vals: any[] = []

  for (const key of allowed) {
    if (body[key] !== undefined) {
      sets.push(`${key} = ?`)
      vals.push(body[key])
    }
  }

  if (body.status === "resolved" || body.status === "closed") {
    sets.push("resolved_at = NOW()")
    if (!current.assignee_id && !body.assignee_id) {
      sets.push("assignee_id = ?")
      vals.push(session.userId)
    }
  }

  if (sets.length === 0) return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 })

  vals.push(id)
  await hdQuery(`UPDATE tickets SET ${sets.join(", ")} WHERE id = ?`, vals)

  // System comments for changes
  const systemComments: string[] = []

  if (body.status && body.status !== current.status) {
    systemComments.push(`Status geändert: ${statusLabels[current.status] || current.status} → ${statusLabels[body.status] || body.status}`)
  }
  if (body.priority && body.priority !== current.priority) {
    systemComments.push(`Priorität geändert: ${priorityLabels[current.priority] || current.priority} → ${priorityLabels[body.priority] || body.priority}`)
  }
  if (body.assignee_id !== undefined && body.assignee_id !== current.assignee_id) {
    if (body.assignee_id) {
      const assignee = await coreQuery<any>("SELECT name FROM users WHERE id = ?", [body.assignee_id])
      systemComments.push(`Zugewiesen an: ${assignee[0]?.name || "Unbekannt"}`)
    } else {
      systemComments.push("Zuweisung entfernt")
    }
  }

  for (const msg of systemComments) {
    await hdInsert(
      "INSERT INTO ticket_comments (ticket_id, user_id, content, is_system) VALUES (?, ?, ?, 1)",
      [id, session.userId, msg]
    )
  }

  // Fire template triggers
  if (body.status === "resolved") {
    const requester = await coreQuery<any>("SELECT name, email FROM users WHERE id = ?", [current.requester_id])
    fireTemplateTrigger("ticket_resolved", {
      ticket_nummer: current.ticket_number,
      ticket_titel: current.title,
      ersteller_name: requester[0]?.name,
      ersteller_email: requester[0]?.email,
      agent_name: session.name,
      agent_email: session.email,
      bereich: "helpdesk",
    }, [current.requester_id])
  }

  if (body.assignee_id && body.assignee_id !== current.assignee_id) {
    const requester = await coreQuery<any>("SELECT name, email FROM users WHERE id = ?", [current.requester_id])
    fireTemplateTrigger("ticket_assigned", {
      ticket_nummer: current.ticket_number,
      ticket_titel: current.title,
      ersteller_name: requester[0]?.name,
      ersteller_email: requester[0]?.email,
      agent_name: session.name,
      agent_email: session.email,
      bereich: "helpdesk",
    }, [body.assignee_id])
  }

  return NextResponse.json({ success: true })
}
