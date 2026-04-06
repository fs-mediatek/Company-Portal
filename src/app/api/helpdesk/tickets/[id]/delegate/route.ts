import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery, hdInsert } from "@/lib/helpdesk-db"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const { id } = await params
  const [ticket] = await hdQuery<any>("SELECT requester_id, delegate_id FROM tickets WHERE id = ?", [id])
  if (!ticket) return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 })

  // Only admin, requester, or delegate can remove delegation
  const allowed = session.role.includes("admin") || session.userId === ticket.requester_id || session.userId === ticket.delegate_id
  if (!allowed) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  await hdQuery("UPDATE tickets SET delegate_id = NULL WHERE id = ?", [id])
  await hdInsert(
    "INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal, is_system) VALUES (?, ?, ?, 1, 1)",
    [id, session.userId, "Stellvertretung wurde entfernt (Datenschutz)"]
  )

  return NextResponse.json({ success: true })
}
