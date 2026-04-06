import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, insert } from "@/lib/db"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const chapters = await query<any>(
    `SELECT id, course_id, title, content, content_type, media_url, sort_order, duration_minutes
     FROM training_chapters WHERE course_id = ? ORDER BY sort_order ASC`,
    [id]
  )
  return NextResponse.json(chapters)
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session || !["admin", "manager"].some(r => session.role.includes(r))) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  if (body.id) {
    // Update existing chapter
    await query(
      `UPDATE training_chapters SET title=?, content_type=?, content=?, media_url=?, duration_minutes=?, sort_order=? WHERE id=? AND course_id=?`,
      [body.title, body.content_type || "text", body.content || null, body.media_url || null, body.duration_minutes || 0, body.sort_order ?? 0, body.id, id]
    )
    return NextResponse.json({ success: true })
  }

  const newId = await insert(
    `INSERT INTO training_chapters (course_id, title, content_type, content, media_url, sort_order, duration_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, body.title, body.content_type || "text", body.content || null, body.media_url || null, body.sort_order ?? 0, body.duration_minutes || 0]
  )
  return NextResponse.json({ id: newId }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session || !["admin", "manager"].some(r => session.role.includes(r))) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const chapterId = searchParams.get("chapterId")
  if (!chapterId) return NextResponse.json({ error: "chapterId fehlt" }, { status: 400 })

  await query(`DELETE FROM training_chapters WHERE id = ? AND course_id = ?`, [chapterId, id])
  return NextResponse.json({ success: true })
}
