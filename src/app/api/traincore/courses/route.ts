import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, insert } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const courses = await query<any>(
    `SELECT id, title, description, category, duration_hours, instructor_name, active, created_at,
      (SELECT COUNT(*) FROM training_chapters WHERE course_id = training_courses.id) as chapter_count,
      (SELECT COUNT(*) FROM training_assignments WHERE course_id = training_courses.id) as assignment_count,
      (SELECT COUNT(*) FROM training_assignments WHERE course_id = training_courses.id AND status = 'completed') as completed_count
     FROM training_courses ORDER BY created_at DESC`
  )
  return NextResponse.json(courses)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !["admin", "manager"].some(r => session.role.includes(r))) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const body = await req.json()
  if (!body.title) return NextResponse.json({ error: "Titel fehlt" }, { status: 400 })

  const id = await insert(
    `INSERT INTO training_courses (title, description, category, duration_hours, instructor_name) VALUES (?, ?, ?, ?, ?)`,
    [body.title, body.description || null, body.category || null, body.duration_hours || null, body.instructor_name || null]
  )
  return NextResponse.json({ id }, { status: 201 })
}
