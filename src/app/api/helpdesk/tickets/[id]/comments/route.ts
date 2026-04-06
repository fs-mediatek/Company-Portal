import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdInsert } from "@/lib/helpdesk-db"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const { id } = await params
  const { body, is_internal } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: "Kommentar darf nicht leer sein" }, { status: 400 })

  const commentId = await hdInsert(
    "INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal) VALUES (?, ?, ?, ?)",
    [id, session.userId, body, is_internal ? 1 : 0]
  )

  return NextResponse.json({ id: commentId })
}
