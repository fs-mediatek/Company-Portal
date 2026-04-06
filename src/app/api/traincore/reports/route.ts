import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !["admin", "manager"].some(r => session.role.includes(r))) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const [users, courses] = await Promise.all([
    query<any>(
      `SELECT u.id, u.name, u.email,
        COUNT(a.id) as total_assigned,
        SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN a.status = 'overdue' THEN 1 ELSE 0 END) as overdue,
        ROUND(AVG(a.progress_percent), 0) as avg_progress
       FROM portal_core.users u
       LEFT JOIN training_assignments a ON a.user_id = u.id
       WHERE u.active = 1
       GROUP BY u.id, u.name, u.email
       HAVING total_assigned > 0
       ORDER BY u.name`
    ),
    query<any>(
      `SELECT c.id, c.title, c.category, c.active,
        COUNT(a.id) as total_assigned,
        SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN a.status = 'overdue' THEN 1 ELSE 0 END) as overdue,
        ROUND(AVG(a.progress_percent), 0) as avg_completion
       FROM training_courses c
       LEFT JOIN training_assignments a ON a.course_id = c.id
       GROUP BY c.id, c.title, c.category, c.active
       ORDER BY c.created_at DESC`
    ),
  ])

  const totalAssigned = await query<any>(`SELECT COUNT(*) as n FROM training_assignments`).then(r => r[0]?.n || 0)
  const totalCompleted = await query<any>(`SELECT COUNT(*) as n FROM training_assignments WHERE status = 'completed'`).then(r => r[0]?.n || 0)
  const totalOverdue = await query<any>(`SELECT COUNT(*) as n FROM training_assignments WHERE status = 'overdue'`).then(r => r[0]?.n || 0)
  const totalCourses = await query<any>(`SELECT COUNT(*) as n FROM training_courses WHERE active = 1`).then(r => r[0]?.n || 0)

  return NextResponse.json({
    stats: { totalCourses, totalAssigned, totalCompleted, totalOverdue },
    users,
    courses,
  })
}
