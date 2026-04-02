import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const ticket = await queryOne(
    `SELECT t.*, r.name as requester_name, r.email as requester_email,
            a.name as assignee_name
     FROM tickets t
     LEFT JOIN users r ON t.requester_id = r.id
     LEFT JOIN users a ON t.assigned_to_user_id = a.id
     WHERE t.id = ?`,
    [id]
  )

  if (!ticket) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })

  // Get comments
  const comments = await query(
    `SELECT c.*, u.name as user_name
     FROM ticket_comments c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.ticket_id = ?
     ORDER BY c.created_at ASC`,
    [id]
  )

  // Get attachments
  const attachments = await query(
    `SELECT a.*, u.name as uploaded_by_name
     FROM ticket_attachments a
     LEFT JOIN users u ON a.uploaded_by = u.id
     WHERE a.ticket_id = ?
     ORDER BY a.created_at ASC`,
    [id]
  )

  // Get possible assignees (techniker, hausmeister, admin, manager)
  const assignees = await query(
    `SELECT id, name FROM users WHERE active = 1 AND (
      role LIKE '%admin%' OR role LIKE '%manager%' OR role LIKE '%techniker%' OR role LIKE '%hausmeister%'
    ) ORDER BY name ASC`
  )

  return NextResponse.json({ ...(ticket as any), comments, attachments, assignees })
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const isPrivileged = ["admin", "manager", "techniker", "hausmeister"].some(r => session.role.includes(r))
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const ticket = await queryOne<any>('SELECT * FROM tickets WHERE id = ?', [id])
  if (!ticket) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })

  const updates: string[] = []
  const vals: any[] = []
  const systemComments: string[] = []

  if (body.status !== undefined && body.status !== ticket.status) {
    updates.push("status = ?"); vals.push(body.status)
    const statusLabels: Record<string, string> = { open: "Offen", in_progress: "In Bearbeitung", waiting: "Wartend", resolved: "Gelöst", closed: "Geschlossen" }
    systemComments.push(`Status geändert: ${statusLabels[ticket.status] || ticket.status} → ${statusLabels[body.status] || body.status}`)
    if (body.status === "resolved" && !ticket.resolved_at) {
      updates.push("resolved_at = NOW()")
    }
  }

  if (body.priority !== undefined && body.priority !== ticket.priority) {
    updates.push("priority = ?"); vals.push(body.priority)
    const prioLabels: Record<string, string> = { low: "Niedrig", medium: "Mittel", high: "Hoch", critical: "Kritisch" }
    systemComments.push(`Priorität geändert: ${prioLabels[ticket.priority]} → ${prioLabels[body.priority]}`)
  }

  if (body.assigned_to_user_id !== undefined && body.assigned_to_user_id !== ticket.assigned_to_user_id) {
    updates.push("assigned_to_user_id = ?"); vals.push(body.assigned_to_user_id || null)
    if (body.assigned_to_user_id) {
      const assignee = await queryOne<any>('SELECT name FROM users WHERE id = ?', [body.assigned_to_user_id])
      systemComments.push(`Zugewiesen an: ${assignee?.name || "Unbekannt"}`)
    } else {
      systemComments.push("Zuweisung entfernt")
    }
  }

  if (body.category !== undefined) { updates.push("category = ?"); vals.push(body.category) }

  if (!updates.length) return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 })

  await query(`UPDATE tickets SET ${updates.join(", ")} WHERE id = ?`, [...vals, id])

  // Add system comments
  for (const msg of systemComments) {
    await query(
      'INSERT INTO ticket_comments (ticket_id, user_id, content, is_system) VALUES (?, ?, ?, 1)',
      [id, session.userId, msg]
    )
  }

  return NextResponse.json({ success: true })
}
