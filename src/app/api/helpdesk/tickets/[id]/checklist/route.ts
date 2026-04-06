import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery, hdInsert } from "@/lib/helpdesk-db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })
  const { id } = await params
  const items = await hdQuery("SELECT * FROM ticket_checklist WHERE ticket_id = ? ORDER BY sort_order ASC, id ASC", [id])
  return NextResponse.json(items)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })
  const { id } = await params
  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: "Inhalt erforderlich" }, { status: 400 })
  const itemId = await hdInsert(
    "INSERT INTO ticket_checklist (ticket_id, content) VALUES (?, ?)", [id, content]
  )
  return NextResponse.json({ id: itemId })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })
  const { item_id, is_done, content } = await req.json()
  if (!item_id) return NextResponse.json({ error: "item_id erforderlich" }, { status: 400 })

  if (is_done !== undefined) {
    await hdQuery(
      "UPDATE ticket_checklist SET is_done = ?, done_by = ?, done_at = ? WHERE id = ?",
      [is_done ? 1 : 0, is_done ? session.name : null, is_done ? new Date() : null, item_id]
    )
  }
  if (content !== undefined) {
    await hdQuery("UPDATE ticket_checklist SET content = ? WHERE id = ?", [content, item_id])
  }
  return NextResponse.json({ success: true })
}
