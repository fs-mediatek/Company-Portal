import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const assignments = await query<any>(
    `SELECT a.id, a.status, a.due_date, a.progress_percent, a.started_at, a.completed_at,
      c.id as course_id, c.title, c.description, c.category, c.duration_hours, c.instructor_name,
      (SELECT COUNT(*) FROM training_chapters WHERE course_id = c.id) as chapter_count
     FROM training_assignments a
     JOIN training_courses c ON a.course_id = c.id
     WHERE a.user_id = ?
     ORDER BY FIELD(a.status, 'overdue', 'in_progress', 'assigned', 'completed'), a.due_date ASC`,
    [session.userId]
  )

  const stats = {
    total: assignments.length,
    assigned: assignments.filter((a: any) => a.status === "assigned").length,
    in_progress: assignments.filter((a: any) => a.status === "in_progress").length,
    completed: assignments.filter((a: any) => a.status === "completed").length,
    overdue: assignments.filter((a: any) => a.status === "overdue").length,
  }

  return NextResponse.json({ assignments, stats })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { assignmentId, status, progress_percent } = await req.json()

  const updates: string[] = []
  const vals: any[] = []

  if (status) {
    updates.push("status = ?")
    vals.push(status)
    if (status === "in_progress") { updates.push("started_at = COALESCE(started_at, NOW())"); }
    if (status === "completed") { updates.push("completed_at = NOW()"); updates.push("progress_percent = 100"); }
  }
  if (progress_percent !== undefined) { updates.push("progress_percent = ?"); vals.push(progress_percent) }

  if (!updates.length) return NextResponse.json({ error: "Keine Felder" }, { status: 400 })

  await query(
    `UPDATE training_assignments SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
    [...vals, assignmentId, session.userId]
  )
  return NextResponse.json({ success: true })
}
