import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, insert } from "@/lib/db"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const assignments = await query<any>(
    `SELECT a.*, u.name as user_name, u.email as user_email
     FROM training_assignments a
     LEFT JOIN portal_core.users u ON a.user_id = u.id
     WHERE a.course_id = ? ORDER BY a.created_at DESC`,
    [id]
  )
  return NextResponse.json(assignments)
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session || !["admin", "manager"].some(r => session.role.includes(r))) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  if (!body.user_id) return NextResponse.json({ error: "user_id fehlt" }, { status: 400 })

  const existing = await query<any>(
    `SELECT id FROM training_assignments WHERE course_id = ? AND user_id = ?`, [id, body.user_id]
  )
  if (existing.length) return NextResponse.json({ error: "Bereits zugewiesen" }, { status: 409 })

  const newId = await insert(
    `INSERT INTO training_assignments (course_id, user_id, assigned_by, due_date) VALUES (?, ?, ?, ?)`,
    [id, body.user_id, session.userId, body.due_date || null]
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
  const assignmentId = searchParams.get("assignmentId")
  if (!assignmentId) return NextResponse.json({ error: "assignmentId fehlt" }, { status: 400 })

  await query(`DELETE FROM training_assignments WHERE id = ? AND course_id = ?`, [assignmentId, id])
  return NextResponse.json({ success: true })
}
