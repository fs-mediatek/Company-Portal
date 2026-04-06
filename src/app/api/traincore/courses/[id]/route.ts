import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { queryOne, query } from "@/lib/db"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const course = await queryOne<any>(
    `SELECT id, title, description, category, duration_hours, instructor_name, active, created_at FROM training_courses WHERE id = ?`,
    [id]
  )
  if (!course) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  return NextResponse.json(course)
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session || !["admin", "manager"].some(r => session.role.includes(r))) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const allowed = ["title", "description", "category", "duration_hours", "instructor_name", "active"]
  const updates = Object.entries(body).filter(([k]) => allowed.includes(k))
  if (!updates.length) return NextResponse.json({ error: "Keine Felder" }, { status: 400 })

  const sets = updates.map(([k]) => `${k} = ?`).join(", ")
  const vals = updates.map(([, v]) => v ?? null)
  await query(`UPDATE training_courses SET ${sets} WHERE id = ?`, [...vals, id])
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { id } = await params
  await query(`DELETE FROM training_courses WHERE id = ?`, [id])
  return NextResponse.json({ success: true })
}
