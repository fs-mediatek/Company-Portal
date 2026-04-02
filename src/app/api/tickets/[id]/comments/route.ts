import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { insert } from "@/lib/db"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { content, is_internal } = await req.json()

  if (!content?.trim()) return NextResponse.json({ error: "Kommentar darf nicht leer sein" }, { status: 400 })

  const isPrivileged = ["admin", "manager", "techniker", "hausmeister"].some(r => session.role.includes(r))

  const commentId = await insert(
    'INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal) VALUES (?, ?, ?, ?)',
    [id, session.userId, content, isPrivileged && is_internal ? 1 : 0]
  )

  return NextResponse.json({ id: commentId }, { status: 201 })
}
